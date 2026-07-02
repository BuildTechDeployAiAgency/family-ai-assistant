> **Status:** plan (not yet built). Code is illustrative — align the OpenRouter client call with the repo's `api/_lib/openrouter.ts` wrapper, `withAuth` signature, `Toast` usage from `components/States.tsx`, and `@/constants/theme` tokens before editing. Verify every `path:line` first.

# Feature 04 — Auto-memory proposals

## Context & why

The assistant learns about a family over time, but writing to memory silently erodes trust and risks hallucinated or transient facts polluting the profile card. Feature 04 lets the agent **propose** durable facts (`family_memory` rows with `status='proposed'`, `source='inferred'`) without ever activating them. Nothing is remembered until the user confirms in **Profile › Memory** via amber cards (Remember / Dismiss). Keeps the user in control and the profile card authoritative.

The schema already supports proposals — **no migration**. Work = a backend inference pass, a PATCH transition, and a small mobile UI. REFERENCE_DATE=2026-05-19.

## Current state

- `family_memory`: `status CHECK active|proposed|archived` (default `active`), `source CHECK user|inferred` (default `user`). RLS isolates by `family_id`. Index `(family_id, status, salience desc)`. **No migration needed.**
- `api/memory.ts`: GET (list), POST (add `{fact,kind?,salience?}` → `status='active'`, `source='user'`), PATCH, DELETE. `withAuth` + `ctx.familyId` + Zod (`memorySchema`). `toClient` → `{id,fact,kind,salience,source,status}`.
- `api/_lib/profileCard.ts`: injects `family_memory WHERE status='active' ORDER BY salience desc` (≤1800 chars). **Proposed already excluded** — keep it so.
- `api/ai/ask.ts`: 4-round tool loop; `runTool(ctx.supabase,…)`; tools read-only. Tools get `ctx.supabase` (RLS userClient) → any insert is family-scoped.
- Mobile `profile/memory.tsx`: loads `api.memory()`, `addMemory`, `deleteMemory`, optimistic. `MemoryItem{id,fact,kind,salience,source,status}`. **No proposed/amber UI.**
- `mobile/src/lib/api.ts`: `memory()`, `addMemory`, `deleteMemory`.
- Tokens `@/constants/theme`: `Brand.amber #B6831A`, `Brand.green #3E7C5A`, etc. Amber wash = `` `${Brand.amber}22` ``. `components/ui.tsx` Card/Pill/SectionLabel; `components/States.tsx` Toast.
- Mockup: `documentation/designs/ui-exploration-almanac/03-states.html` amber proposed cards (Remember/Dismiss) + toasts — match this.

## Schema changes

**None.** Existing `family_memory` supports `status='proposed'`, `source='inferred'`, `status='archived'`, and the `proposed→active`/`proposed→archived` transitions. Confirm `buildProfileCard` keeps `WHERE status='active'`.

## Backend

### Approach A (RECOMMENDED): post-answer inference pass

After `api/ai/ask.ts` produces its final answer, run one cheap follow-up LLM call to extract durable facts. Cleaner than a write-tool the model may spam mid-loop.

```ts
// api/ai/ask.ts — after final answer assembled, before returning
try {
  if (shouldRunInference(q, a, costSoFar)) {
    const proposals = await extractProposals({ question: q, answer: a, familyId: ctx.familyId, supabase: ctx.supabase });
    await persistProposals(ctx.supabase, proposals);
    meta.proposedCount = proposals.length; // optional, non-breaking
  }
} catch (e) {
  console.warn('[memory-proposal] inference failed', e); // NEVER break the answer
}
```

```ts
// api/_lib/memoryProposal.ts
const MAX_PROPOSALS = 3;

export async function extractProposals(input: {
  question: string; answer: string; familyId: string; supabase: SupabaseClient;
}) {
  const completion = await chat({           // reuse api/_lib/openrouter.ts
    model: 'openai/gpt-4o-mini', max_tokens: 400, temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content:
        'Extract 0-3 durable, family-specific facts worth remembering long-term. ' +
        'Skip transient/time-bound info (weather, one-off tasks, "this week"). ' +
        'Return JSON {"proposals":[{"fact":string,"kind":"fact|preference|event|place|relationship|other","salience":number}]}. ' +
        'salience 0-100 (50 default). If nothing durable, {"proposals":[]}.' },
      { role: 'user', content: `Q: ${input.question}\nA: ${input.answer}` },
    ],
  });
  const parsed = JSON.parse(completion.content ?? '{"proposals":[]}');
  const raw = Array.isArray(parsed.proposals) ? parsed.proposals.slice(0, MAX_PROPOSALS) : [];

  // dedupe vs existing active+proposed for this family (RLS-scoped)
  const existing = await input.supabase.from('family_memory').select('fact').in('status', ['active','proposed']);
  const seen = new Set((existing.data ?? []).map(r => normalize(r.fact)));

  return raw
    .filter((p: any) => p.fact && !seen.has(normalize(p.fact)))
    .map((p: any) => ({
      family_id: input.familyId,           // ← JWT-derived, never body
      fact: String(p.fact).slice(0, 500),
      kind: p.kind ?? 'fact',
      salience: clamp(p.salience ?? 50, 0, 100),
      source: 'inferred', status: 'proposed',
    }));
}
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();

export async function persistProposals(supabase: SupabaseClient, proposals: any[]) {
  if (!proposals.length) return;
  const { error } = await supabase.from('family_memory').insert(proposals);
  if (error) throw error;
}
```

Notes: cap 3/turn; normalized dedupe vs `active`+`proposed`; gate behind a cost cap (`shouldRunInference`); errors swallowed (never break the answer); optional `proposedCount` in response (non-breaking); `family_id` from `ctx.familyId`; insert via `ctx.supabase` (RLS verifies ownership).

### Approach B (alt, NOT chosen): `propose_memory` write-tool

Register a write-tool the model calls explicitly. **Risks:** model spams mid-loop, duplicate proposals, dedupe on every call, harder to cap, mixes writes into a read-only tool set. Documented for completeness; **post-answer pass is chosen** — one structured place to enforce cap + dedupe.

### Profile-card guard

`buildProfileCard` already filters `WHERE status='active'`. Proposed facts have **zero effect on answers** until confirmed. Do not widen the filter.

### Confirm / dismiss — `api/memory.ts` PATCH

```ts
// api/_lib/schemas.ts
export const memoryUpdateSchema = z.object({ status: z.enum(['active','archived']) });
```

```ts
// api/memory.ts PATCH: parse ?id=, fetch row, allow transition ONLY from 'proposed'
const { data: existing } = await ctx.supabase.from('family_memory').select('id,status').eq('id', id).single();
if (!existing) throw new HttpError(404, 'Not found');
if (existing.status !== 'proposed') throw new HttpError(409, 'Only proposed memories can be confirmed or dismissed');
const { data } = await ctx.supabase.from('family_memory')
  .update({ status: body.status, updated_at: new Date().toISOString() })
  .eq('id', id).select().single();
return res.json(toClient(data));
```

- **Remember** = PATCH `{status:'active'}` (bumps `updated_at`; enters profile card next turn).
- **Dismiss** = PATCH `{status:'archived'}` (keep row for audit + dedupe; don't hard-delete).
- Transition allowed **only from `proposed`** (409 otherwise). RLS ensures ownership.

### GET — include proposed

`api/memory.ts` GET must return **`active` + `proposed`** (exclude `archived`) so the UI can split sections:

```ts
.in('status', ['active','proposed'])   // was: eq('status','active')
.order('salience', { ascending: false });
```

## Mobile

### `mobile/src/lib/api.ts`

```ts
confirmMemory: (id: string) => authedFetch(`/memory?id=${id}`, { method:'PATCH', body: JSON.stringify({ status:'active' }) }),
dismissMemory: (id: string) => authedFetch(`/memory?id=${id}`, { method:'PATCH', body: JSON.stringify({ status:'archived' }) }),
```

### `mobile/src/app/profile/memory.tsx`

Split into a top amber **"Waiting for you"** section (`status==='proposed'`) and the existing **Active** list (`status==='active'`).

- Amber Card: `backgroundColor: `${Brand.amber}22``, `borderColor: Brand.amber`, `Radius.md`; fact text; kind Pill; **Remember** (`Brand.green`) + **Dismiss** (ghost: transparent + `Brand.border`).
- Optimistic: Remember → move card proposed→active locally + `Toast` "Added to memory"; Dismiss → remove locally + `Toast` "Dismissed"; rollback on error.
- Match mockup `03-states.html`.

```tsx
const proposed = memories.filter(m => m.status === 'proposed');
const active   = memories.filter(m => m.status === 'active');
// {proposed.length > 0 && <SectionLabel>Waiting for you · {proposed.length}</SectionLabel>}
//   amber cards with onRemember / onDismiss
// <SectionLabel>Active</SectionLabel> + existing list
```

### Profile entry badge

On the Profile screen, "What I've learned" link shows **N waiting** when `proposed.length > 0` (amber Pill). `proposedCount` from `api.memory()`; re-fetch on focus.

## AI agent

Agent unchanged. The post-answer pass sits **outside** the tool loop — no new tool def, no prompt bloat, no mid-answer write spam. Only change is `api/ai/ask.ts` calling `extractProposals` after the final answer.

## Isolation & security review

- **`family_id` source**: `ctx.familyId` from `authenticate()` (JWT), never body. Inference pass runs inside the same authed request → same identity.
- **RLS userClient**: proposal INSERT + PATCH transition both via `ctx.supabase`; `auth_family_id()` verifies ownership. No cross-family writes.
- **Proposed never affects answers**: `buildProfileCard` filters `active` only — the core safety property.
- **Cap 3/turn + dedupe**: prevents flooding.
- **Errors contained**: inference failures caught + logged; answer still returns.
- **Key server-only**: follow-up call uses the server OpenRouter client; no key reaches mobile.
- **Transition validation**: only `proposed→active|archived`; 409 otherwise — can't re-activate archived or mutate user facts via this endpoint.
- **Future paths**: a Telegram/cron proposal path (Feature 05) must use a **verified** `family_id`, never inbound body.

## Effort, sequencing, dependencies

- Size **S–M**. No migration. Backend can ship first (proposed rows sit invisible until the mobile UI lands).
- Order: (1) `memoryUpdateSchema` + PATCH transition + GET include proposed → (2) `memoryProposal.ts` + wire into `ask.ts` (try/catch, cost gate) → (3) `api.ts` confirm/dismiss → (4) `memory.tsx` amber UI → (5) Profile badge.
- Cost: one extra `gpt-4o-mini` call per answer (≤400 tokens), gated by cost cap.

## Step-by-step task list

1. `api/_lib/schemas.ts`: add `memoryUpdateSchema`.
2. `api/memory.ts` PATCH: `?id=`, fetch, assert `proposed` (409), update status + `updated_at`, return `toClient`.
3. `api/memory.ts` GET: `.in('status',['active','proposed'])`.
4. `api/_lib/memoryProposal.ts`: `extractProposals` (OpenRouter json_object, cap 3, dedupe) + `persistProposals`.
5. `api/ai/ask.ts`: post-answer `try{extractProposals+persist}catch{log}`; optional `proposedCount`.
6. Confirm `profileCard.ts` stays `status='active'` (no-op check).
7. `mobile/src/lib/api.ts`: `confirmMemory` / `dismissMemory`.
8. `mobile/src/app/profile/memory.tsx`: proposed/active split, amber cards, optimistic + Toast.
9. Profile screen: `N waiting` Pill; re-fetch on focus.
10. Mockup parity check vs `03-states.html`.

## Verification

- `./node_modules/.bin/tsc --noEmit` (backend + mobile) clean; `expo export -p web` clean.
- Ask something revealing a durable fact ("our dog is called Pixel") → `family_memory` gains `status='proposed'`, `source='inferred'`, correct `family_id`.
- Profile › Memory: amber "Waiting for you" card at top; Active unchanged.
- Tap **Remember** → moves to Active, Toast "Added to memory", row `active`; next answer reflects it (now in profile card).
- Tap **Dismiss** on another → removed, Toast, row `archived`; later answers ignore it.
- Dedupe: re-ask same fact → no duplicate proposal.
- Cap: answer with many durable facts → ≤3 proposals.
- **Cross-family probe**: from family A, no read/write path to family B `family_memory` (RLS; `ctx.familyId` from JWT only).
- Error path: break OpenRouter key → answer still returns, no 500, `proposedCount` 0/omitted.
- Deploy backend + PWA; smoke-test full Remember/Dismiss loop on live URL (`diogo@family.ai`/`familyai123`).
