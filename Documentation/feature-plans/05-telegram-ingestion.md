> **Status:** plan (not yet built). ISOLATION-CRITICAL — read the P0 section before touching code. Snippets are illustrative: align the extract-core export (`api/ai/extract.ts` may not export `extractDocument` — refactor its core into a shared fn), `resolveMember()`'s real signature (it takes a Supabase client, not a familyId), and the Vercel handler style before editing. Verify every `path:line` first. **Build LAST**, after Features 01–04.

# Feature 05 — Telegram ingestion

## Context & why

The original core value prop: a family forwards docs/photos/school emails to a Telegram bot; the server extracts + files them into the right family's vault/communications automatically. Restores the "vault fills itself" promise — the difference between a manual database and an assistant.

Effort **L**, multi-week. Build **LAST** (after Features 01–04). Isolation-critical: the entire feature rests on a *verified* `chat_id → family_id` mapping.

## Current state

- `api/ai/extract.ts`: POST `image(base64)+mime` → OpenRouter vision → `{name,number,category,owner,expiryDate,confidence}`. Reusable core for ingest (refactor the model call into a shared fn callable without an HTTP req).
- `api/documents.ts` POST inserts `{family_id, member_id, title, document_number, category, expiry_date, source_channel}`. `api/communications.ts` GET (channel default `'email'`; Telegram uses `channel='telegram'`).
- `supabase.ts`: `userClient(token)` RLS-scoped; `serviceClient()` bypasses RLS (reserved for ingestion) — **every query MUST add explicit `.eq('family_id', resolvedId)` on reads and explicit `family_id:` on inserts.**
- `telegram_links(id, family_id NOT NULL FK families, chat_id text UNIQUE, created_at)`, RLS active. **Gap:** no verification columns.
- `ingestion_events(id, family_id nullable, source, external_id, status CHECK pending|processed|failed|skipped default pending, payload jsonb)`, `unique(source, external_id)`, RLS active. Ready for idempotency.
- `family_members(name, aliases)`, `resolveMember()` fuzzy resolver (RLS-scoped).
- Mobile: profile screens under `mobile/src/app/profile/`; `api.ts` `authedFetch`. Tokens `@/constants/theme`; `components/ui.tsx` Card; `States.tsx`.
- Deploy: backend `family-ai-assistant-livid.vercel.app`; PWA `family-ai-app.vercel.app`. Supabase `lldbxyadiprsgtftduhe`. Env server-only (no `VITE_`/`EXPO_PUBLIC_`). REFERENCE_DATE=2026-05-19.

## Schema changes

Migration `0009_telegram_verification.sql` (RLS already active on `telegram_links` — only add columns). If Feature 01 already claimed `0009`, use the next free number.

```sql
-- 0009_telegram_verification.sql
alter table public.telegram_links
  add column verification_token  text,
  add column verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','revoked')),
  add column verified_at    timestamptz,
  add column linked_by_user uuid references public.users(id),
  add column chat_username  text;

-- chat_id stays UNIQUE; nullable until /start <token> redeems it.
-- family_isolation policy already active; no policy change required.
```

`ingestion_events` reused as-is. Idempotency key: `unique(source,external_id)` with `source='telegram'`, `external_id=message_id`. Apply via Supabase MCP `apply_migration`.

## Backend

### `api/_lib/telegram.ts`

```ts
const API = 'https://api.telegram.org';
const BOT = process.env.TELEGRAM_BOT_TOKEN!;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;

export function assertWebhookAuth(req, res): boolean {
  const h = (req.headers['x-telegram-bot-api-secret-token'] as string) || '';
  if (h !== SECRET) { res.status(401).json({ error: 'unauthorized' }); return false; }
  return true;
}
export async function sendMessage(chat_id, text: string) {
  await fetch(`${API}/bot${BOT}/sendMessage`, { method:'POST',
    headers:{'content-type':'application/json'}, body: JSON.stringify({ chat_id, text }) });
}
export async function getFile(file_id: string) {
  const r = await fetch(`${API}/bot${BOT}/getFile?file_id=${encodeURIComponent(file_id)}`);
  return (await r.json()).result; // { file_path, file_size, ... }
}
export async function downloadFileAsBase64(file_path: string) {
  const r = await fetch(`${API}/file/bot${BOT}/${file_path}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return { base64: buf.toString('base64'), mime: r.headers.get('content-type') || 'application/octet-stream' };
}
```

### `api/telegram/link.ts` (JWT-gated — issues the one-time token)

```ts
import { randomBytes } from 'node:crypto';
import { authenticate } from '../_lib/http';
import { serviceClient } from '../_lib/supabase';
const BOT = process.env.TELEGRAM_BOT_USERNAME!; // without @
const TTL_MIN = 15;

export default async function handler(req, res) {
  const ctx = await authenticate(req);          // family_id ONLY from JWT
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const token = randomBytes(12).toString('hex');
  const sb = serviceClient();
  const { error } = await sb.from('telegram_links').upsert({
    family_id: ctx.familyId, linked_by_user: ctx.userId,
    verification_token: token, verification_status: 'pending',
    chat_id: null, verified_at: null,
  }, { onConflict: 'family_id' });
  if (error) return res.status(500).json({ error: 'db' });
  return res.status(200).json({
    token, expires_at: new Date(Date.now()+TTL_MIN*60_000).toISOString(),
    deep_link: `https://t.me/${BOT}?start=${token}`,
  });
}
```

Token: single-use, 15-min TTL, redeemed via `/start <token>`. `family_id` = JWT-derived `ctx.familyId`, never body.

### `api/telegram/status.ts` (JWT-gated)

```ts
const ctx = await authenticate(req);
const { data } = await serviceClient()
  .from('telegram_links').select('verification_status, chat_username, verified_at')
  .eq('family_id', ctx.familyId)   // explicit even though we could scope by JWT
  .maybeSingle();
return res.status(200).json({ status: data?.verification_status ?? 'none', ...data });
```

### `api/telegram/webhook.ts` — the ingest path (NO user JWT; auth = Telegram secret)

```ts
import { serviceClient } from '../_lib/supabase';
import { assertWebhookAuth, sendMessage, getFile, downloadFileAsBase64 } from '../_lib/telegram';
import { extractFromImage } from '../ai/extract';   // shared core
import { resolveMember } from '../_lib/members';

export default async function handler(req, res) {
  if (!assertWebhookAuth(req, res)) return;          // 401 on secret mismatch
  const msg = req.body?.message;
  if (!msg) return res.status(200).json({ ok: true });

  const sb = serviceClient();                        // bypasses RLS — pin family_id everywhere
  const chatId = String(msg.chat.id);

  // (3) /start <token> → bind chat to the family whose PENDING token matches.
  if (msg.text?.startsWith('/start ')) {
    const token = msg.text.slice(7).trim();
    const { data: link } = await sb.from('telegram_links')
      .select('family_id, verified_at')
      .eq('verification_token', token)
      .eq('verification_status', 'pending')
      .maybeSingle();
    if (!link) return void sendMessage(chatId, 'Invalid or expired link. Re-connect from the app.');
    // (enforce 15-min TTL against the pending row's created/issued time)
    await sb.from('telegram_links').update({
      chat_id: chatId, chat_username: msg.from?.username ?? null,
      verification_status: 'verified', verified_at: new Date().toISOString(),
      verification_token: null,                       // single-use
    }).eq('family_id', link.family_id).eq('verification_token', token);
    return void sendMessage(chatId, '✅ Linked. Forward docs/photos and I will file them.');
  }

  // (4) Resolve VERIFIED chat → family_id. THE ONLY source of family_id.
  const { data: link } = await sb.from('telegram_links')
    .select('family_id').eq('chat_id', chatId).eq('verification_status', 'verified').maybeSingle();
  if (!link) return void sendMessage(chatId, 'This chat is not linked. Connect from the app.');
  const verifiedFamilyId: string = link.family_id;    // ground truth for ALL writes

  // (5) Idempotency via unique(source, external_id).
  const { error: idemErr } = await sb.from('ingestion_events').insert({
    source: 'telegram', external_id: String(msg.message_id),
    family_id: verifiedFamilyId, status: 'pending', payload: req.body,
  });
  if (idemErr?.code === '23505') return void sendMessage(chatId, 'Already filed ✓');
  if (idemErr) return void sendMessage(chatId, 'Could not file, try again.');

  const caption = msg.caption ?? msg.text ?? '';
  try {
    if (msg.photo?.length || msg.document) {          // (6) photo/document → documents
      const fid = msg.photo ? msg.photo[msg.photo.length-1].file_id : msg.document.file_id;
      const meta = await getFile(fid);
      const { base64, mime } = await downloadFileAsBase64(meta.file_path);
      const ex = await extractFromImage(base64, mime);
      const resolved = await resolveMember(/* userClient? */ sb, ex.owner ?? caption); // scope to verifiedFamilyId
      await sb.from('documents').insert({
        family_id: verifiedFamilyId,                   // EXPLICIT — from verified link, never payload
        member_id: resolved.status === 'ok' ? resolved.member.id : null,
        title: ex.name ?? msg.document?.file_name ?? 'Telegram document',
        document_number: ex.number, category: ex.category, expiry_date: ex.expiryDate,
        source_channel: 'telegram',
      });
      await sendMessage(chatId, `Filed ${ex.name ?? 'document'} ✓`);
    } else if (msg.text) {                             // (7) text → communications
      await sb.from('communications').insert({
        family_id: verifiedFamilyId,                   // EXPLICIT
        channel: 'telegram', sender: msg.from?.username ?? 'telegram',
        subject: caption.slice(0,120) || 'Telegram message', body: msg.text,
      });
      await sendMessage(chatId, 'Filed message ✓');
    }
    await sb.from('ingestion_events').update({ status:'processed' })
      .eq('family_id', verifiedFamilyId).eq('source','telegram').eq('external_id', String(msg.message_id));
  } catch (e) {
    await sb.from('ingestion_events').update({ status:'failed' })
      .eq('family_id', verifiedFamilyId).eq('source','telegram').eq('external_id', String(msg.message_id));
    await sendMessage(chatId, 'Filing failed — will retry.');
  }
  return res.status(200).json({ ok: true });
}
```

> **NOTE on `resolveMember`:** it is RLS-scoped for `userClient`. Under `serviceClient` it does NOT auto-scope — either pass a family-scoped query or add `.eq('family_id', verifiedFamilyId)` inside a webhook-specific member resolver. Do not let a caption resolve a member outside `verifiedFamilyId`.

The webhook inserts directly with `serviceClient` (no user JWT) and hard-pins `family_id = verifiedFamilyId` on every write.

## Mobile

### `mobile/src/lib/api.ts`

```ts
telegramLink:   () => authedFetch('/telegram/link',   { method:'POST' }),
telegramStatus: () => authedFetch('/telegram/status', { method:'GET'  }),
```

### `mobile/src/app/profile/telegram.tsx`

Connect screen: shows status (`not connected` / `pending` / `connected` / `revoked`); **Connect Telegram** button → `api.telegramLink()` → `Linking.openURL(deep_link)`; shows the deep link + `/start` instructions; polls `api.telegramStatus()` every ~4s while pending until `verified`. Uses `Card`, `Brand`/`Radius`/`FontFamily`. Add a row on the profile index routing to `/profile/telegram`. Register the route in the profile stack.

## AI agent

N/A. Ingestion is upstream; ingested `documents`/`communications` become agent-queryable via existing tools. (Optionally: extracted docs could feed Feature 04 memory proposals — out of scope here.)

## Isolation & security review (P0 — CENTERPIECE)

The whole risk surface is one thing: **a mis-bound or spoofed `chat_id → family_id` mapping.** Every ingest writes with `serviceClient` (bypasses RLS), so correctness rests entirely on resolving `family_id` from a **verified** source and pinning it on every read/write. A cross-family ingest = P0 incident (one family's docs leak into another, or attacker content is injected into a victim family).

### Threat model

- **(a) Random user messages the bot pretending to be a family.** Blocked by verified-token binding: the webhook only writes when a `/start <token>` matched a `pending` `telegram_links` row. No token → no `chat_id→family_id` row → step (4) returns "not linked" → never ingested.
- **(b) Token theft / replay.** Token = `randomBytes(12)` (96-bit), single-use (`verification_token` nulled on redemption), 15-min TTL, bound to the redeeming `chat_id`. Replay finds no `pending` row → rejected.
- **(c) Webhook forgery (attacker POSTs fake updates).** Blocked by `X-Telegram-Bot-Api-Secret-Token` header checked against `TELEGRAM_WEBHOOK_SECRET` (set via `setWebhook secret_token`). Missing/mismatch → 401. This is the webhook's `authenticate()` equivalent — first statement, no ingest path reachable without it.
- **(d) `serviceClient` bypasses RLS.** `verifiedFamilyId` comes ONLY from `telegram_links.select('family_id').eq('chat_id',chatId).eq('verification_status','verified')` — NEVER from `msg.text/caption/from` or body. Every write sets `family_id: verifiedFamilyId`; every read adds `.eq('family_id', verifiedFamilyId)`. Applies to `ingestion_events`, `documents`, `communications`, and member resolution.
- **(e) Verified chat later removed/compromised.** `verification_status='revoked'` stops ingestion immediately (resolution filters `='verified'`). Expose a revoke button later; DB-level for now.
- **(f) Confused deputy.** Caption "for family B" → IGNORE. `family_id` is exclusively the chat's verified binding; `resolveMember` runs only within `verifiedFamilyId`.

### Review checklist (must pass before merge)

1. `grep -n "serviceClient\|\.from(" api/telegram/webhook.ts` — for each: INSERT sets `family_id: verifiedFamilyId` (the variable, not a payload field); UPDATE/SELECT chains include `.eq('family_id', verifiedFamilyId)` (or `link.family_id` right after resolution).
2. `/start` branch writes `family_id` from the pending row (`link.family_id`), never `msg`.
3. Resolution query filters `verification_status='verified'`.
4. `assertWebhookAuth` is the first statement; no ingest reachable without it.
5. No query reads `family_id` from `req.body`, `msg`, `caption`, or `text`.
6. Idempotency insert relies on `unique(source, external_id)`; conflict → success without writing.
7. Member resolution is scoped to `verifiedFamilyId` (webhook-specific resolver or explicit filter).
8. Cross-family test returns 0 rows in the wrong family (see Verification) — any >0 = P0 fail.

## Effort, sequencing, dependencies

- Effort **L**, multi-week. Depends on Features 01–04 (extract, documents, communications, resolveMember).
- Infra: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME` (Vercel env, server-only).
- Build order: migration → `telegram.ts` → `link.ts`+`status.ts` → `webhook.ts` → mobile connect screen → BotFather + `setWebhook` → cross-family verification.

## Step-by-step task list

1. `apply_migration` `0009_telegram_verification.sql` (or next free number).
2. Set Vercel env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`.
3. Refactor `api/ai/extract.ts` core into a shared `extractFromImage(base64, mime)` callable off-request.
4. `api/_lib/telegram.ts` helper (`assertWebhookAuth`, `sendMessage`, `getFile`, `downloadFileAsBase64`).
5. `api/telegram/link.ts` (JWT, upsert pending token, deep link).
6. `api/telegram/status.ts` (JWT, `.eq('family_id', ctx.familyId)`).
7. `api/telegram/webhook.ts` (secret check → `/start` bind → verified resolution → idempotency → extract → file; webhook-scoped member resolver).
8. Mobile: `api.telegramLink/telegramStatus`; `profile/telegram.tsx`; profile-index row + route registration.
9. BotFather: create bot; set `TELEGRAM_BOT_USERNAME`.
10. `setWebhook` with url + `secret_token`.
11. Run P0 verification matrix; `./node_modules/.bin/tsc --noEmit` clean.

## Verification

- **Cross-family isolation (P0):** Family A links chat C_A; Family B links C_B. A forwards a passport photo → appears ONLY in A's vault (as A `userClient` → row present; as B → 0 rows). B's chat sees nothing. Repeat with a document and a text message. **Any leak = P0.**
- **Unlinked chat:** message from a chat with no `verified` link → "not linked" reply, no `ingestion_events`/`documents`/`communications` rows.
- **Webhook forgery:** `curl -X POST .../api/telegram/webhook` without/with wrong `X-Telegram-Bot-Api-Secret-Token` → 401.
- **Token replay:** redeem `/start <token>` twice → second rejected; status stays `verified`, no second bind.
- **Token expiry:** redeem after 15 min → rejected.
- **Caption injection:** forward from A's chat with caption "for family B" → filed under A (binding, not text).
- **Idempotency:** Telegram retries same `message_id` → unique conflict → skip, "Already filed", no duplicate.
- `./node_modules/.bin/tsc --noEmit` exits 0.

## Ops & deployment

- Register bot with @BotFather → `TELEGRAM_BOT_TOKEN`; set username → `TELEGRAM_BOT_USERNAME`.
- Vercel project `family-ai-assistant-livid`: set the 3 env vars (server-only, no `VITE_`/`EXPO_PUBLIC_`).
- Register webhook:
  ```bash
  curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -H "content-type: application/json" \
    -d '{"url":"https://family-ai-assistant-livid.vercel.app/api/telegram/webhook","secret_token":"'"$TELEGRAM_WEBHOOK_SECRET"'"}'
  ```
- Vercel serverless limits: keep media base64 in memory under the body/timeout caps; oversized files → reply "too large", log `ingestion_events.status='skipped'` (same idempotency key so retries don't duplicate).
- Revoke a chat: `update telegram_links set verification_status='revoked' where chat_id=?` (DB-level until a UI ships).
