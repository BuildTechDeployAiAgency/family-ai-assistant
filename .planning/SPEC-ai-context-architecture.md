# Family AI Assistant — Architecture Spec & Roadmap

## Context

Goal: a per-family AI assistant (mobile-first) that ingests household docs + school
comms, files them, answers natural-language questions ("what's my passport expiry?",
"Jolie's last school result?"), and later proactively reminds + suggests (appointments,
weekend activities). Must work for ONE family now but scale to hundreds without redesign.

The user's explicit question: **how do we host/handle the AI context at scale?**

State of the repo today (two codebases, big doc-vs-reality gap):
- **Legacy web** (`src/App.jsx`, 3,643 lines + `server/` Express + SQLite) — working AI
  POC but **AI key runs client-side** and a **live OpenRouter key is committed in `.env`**.
- **Expo mobile** (`mobile/`, SDK 54, expo-router, React Context) — clean, 3 tabs
  (Documents / School / Actions), scan flow, per-child school hub — **100% mock, no backend**.
- CLAUDE.md + `.planning/ROADMAP.md` promise Supabase + Vercel `api/` + Upstash + Telegram
  + Drive. **None wired.** ROADMAP is authoritative; `research/ARCHITECTURE.md` (SQLite/Fly)
  is stale — ignore its stack.

Locked scope decisions (from user):
- **Mobile-only v1.** Web app = legacy/throwaway.
- **Reactive-first.** v1 = extraction + Q&A. Proactive reminders + weekend suggestions = fast-follow.
- **Telegram forwarding = first ingestion channel** (also the notification channel).
- **Hybrid context strategy** = tool-calling on structured data + pgvector on free text + a small always-on family profile card.

---

## The AI Context Architecture (the core answer)

**Don't ship the whole family blob back and forth.** Store the source of truth in
Postgres, isolated per family, and let the model *pull* only what it needs. Three layers:

### Layer 1 — Family Profile Card (always-on, tiny)
A ~150-token structured snapshot injected into every agent system prompt: members, kids'
ages (derived from DOB, never stale), grades, and live counts (expiring docs / open tasks /
upcoming appts). Roster cached in Upstash (long TTL, invalidate on member change); counts
computed live (3 indexed `count(*)`). Goes in the prompt-cached prefix → near-free on repeat turns.
Scales with family size (~6 people), **not** with history.

### Layer 2 — Tool-calling for structured facts (the workhorse)
The agent answers expiry dates, grades, due dates, appointments via OpenAI-compatible
**function-calling** against Postgres — NOT by stuffing rows into context. The model never
sees SQL and never receives a `family_id`; the server injects it from the verified JWT.
Tools take `member_name` (string); server resolves to `member_id` via aliases (GIN index).

| Tool | Params | Returns |
|---|---|---|
| `get_documents` | member_name?, category?, expiring_within_days?, query? | docs w/ expiry/status |
| `get_school_results` | child_name (req), subject?, latest_only? | results w/ grade/date |
| `get_appointments` | member_name?, from_date?, to_date?, category? | upcoming appts |
| `get_tasks` | member_name?, include_completed?, due_within_days? | open/closed tasks |
| `search_communications` | query (req), member_name?, category?, limit? | **wraps pgvector (Layer 3)** |
| `get_family_member` | name | resolves fuzzy name → canonical member (or `ambiguous`) |

Request loop: JWT→family_id → rate-limit → assemble profile card → call model with tools →
model picks tool(s) → server runs parameterized SQL `WHERE family_id=$1 AND ...` (≤50 rows) →
feed results back → model answers or loops (cap **4 rounds**) → write `llm_audit_log`.

Example — *"What's my passport expiry?"*: profile card names the adults → `get_documents{category:"Identity"}` → grounded answer. One round, indexed.

### Layer 3 — pgvector retrieval for unbounded text
Only free text gets embedded: `communications.body`, doc notes, activity descriptions.
Structured facts are NEVER embedded (answered by columns). Embedded on the **write path**
during ingestion (chunk ~500 tok / 50 overlap; most school emails = 1 chunk). Exposed to the
agent **as a tool** (`search_communications`) so the model decides when narrative context is
needed. Cosine HNSW index, `family_id`-pinned first. Mixed questions ("anything to pay for
Yusuf this week?") let the model combine `get_tasks` (authoritative date) + `search_communications` (the quote).

**Why this scales to hundreds of families:** every request touches ONE family's data,
isolated by RLS + `family_id`. Stateless Vercel functions; no per-family process. Cost is
linear and capped per family. Profile card is bounded; tool results are capped; retrieval is
pre-filtered. Full-context-dump (rejected) breaks as per-family data grows; pure-RAG
(rejected) gives fuzzy answers for hard facts like dates.

### Model tiering (cost control)
- **Extract tier** (cheap, JSON-mode): bulk doc/email extraction + classification.
- **Agent tier** (smart, must support tool-calling): user Q&A.
- **Embedding tier**: dedicated cheap embedding model (1536-dim → matches `vector(1536)`).
- ⚠️ Configured slug `google/gemini-3.5-flash` **is not a real OpenRouter slug** — pick verified
  slugs at impl time + a documented fallback chain. **Verify tool-calling support before locking.**

---

## Data Model (Postgres / Supabase, multi-tenant-ready)

Every domain row carries `family_id uuid NOT NULL`. RLS via membership lookup (not `auth.uid()` directly).

Extensions: `pgcrypto`, `vector`.

**Tenancy:** `families` (timezone, locale, quiet_hours) · `users` (→ `auth.users`, family_id, role
owner/adult/viewer) · `family_members` (people incl. children; `member_type`, `date_of_birth`
[age derived], `grade`, `aliases text[]` GIN-indexed; children have `user_id=null`).

**Domain (all family_id-scoped, indexed on family_id + hot column):**
- `documents` — member_id, title, category, document_number, expiry_date, status, source_channel,
  storage_path, extracted_raw jsonb, confidence. Index `(family_id, expiry_date)`.
- `communications` — replaces `emails`; member_id, channel, sender, subject, body, category,
  received_at, source_ref, processed. Index `(family_id, received_at desc)`.
- `tasks` — member_id, source_comm_id (provenance), title, priority, due_date, completed.
  Partial index `(family_id, due_date) where not completed`.
- `school_results` — member_id (child), subject, term, grade (text), numeric_score, result_date.
  Index `(family_id, member_id, result_date desc)`.
- `appointments` — member_id, title, location, starts_at, ends_at, category.
- `activity_log` — append-only; powers weekend suggestions later.
- `embeddings` — **polymorphic**: `(source_type, source_id, chunk_index)` unique (idempotent
  re-embed), content, metadata jsonb, `embedding vector(1536)`, HNSW cosine index.

**Ops:** `telegram_links` (chat_id ↔ family_id routing) · `ingestion_events`
(`unique(source, external_id)` idempotency) · `llm_audit_log` (tokens, cost_usd, tools).

**RLS** — one helper, applied uniformly:
```sql
create function auth_family_id() returns uuid language sql stable security definer
as $$ select family_id from public.users where id = auth.uid() $$;
-- policy template on every domain table:
using (family_id = auth_family_id()) with check (family_id = auth_family_id());
```
Two access paths: **mobile→`api/` with user JWT** (RLS auto-enforced); **server ingestion/agent
tools→service-role** (bypasses RLS → MUST add explicit `where family_id=$resolved`, id from
verified token / `telegram_links` only, never request body). This is the #1 invariant.

Data shapes must match existing fixtures (`src/fixtures/hassan.js`) so the extraction zod
schemas line up: docs have number/expiry/owner/category; comms carry school content; AI output
= events + actionItems + deadlines + draftReply.

---

## Write Path — Telegram ingestion

```
Telegram → POST /api/telegram/webhook
  1. Verify X-Telegram-Bot-Api-Secret-Token header (reject otherwise)
  2. chat_id → family_id via telegram_links (unlinked → reply /link prompt)
  3. ingestion_events upsert ON CONFLICT DO NOTHING (idempotency on update_id / file_unique_id)
  4. Return 200 fast
  5. Extract (v1: synchronous — Telegram ack window ~60s is generous):
     - text → body; photo/doc → Telegram getFile → Supabase Storage → vision/OCR
     - CHEAP model, response_format=json_object, zod-validated →
       {comm_type|doc_type, category, member_name, title, expiry_date?,
        expiry_date_source_text?, document_number?, tasks[], appointments[], summary}
  6. Resolve member_name → member_id (fuzzy, scoped)
  7. Transaction: write communications (always) + documents/tasks/appointments (linked via source_comm_id)
  8. Chunk + embed body → embeddings
  9. Confirmation reply: "Filed under Yusuf · Education. 2 tasks added. Reply 'undo' to revert."
```
**Verification guard:** `expiry_date_source_text` must be a verbatim substring of source text;
else mark low-confidence + flag for manual review (no silent trust). **Scale escape hatch:**
`ingestion_events` (pending) + Vercel cron / Upstash QStash drains async — config switch, not redesign.

---

## Security Fixes (MUST precede feature work — Phase 1)

1. **Rotate the OpenRouter key NOW** — it was inlined into client bundles (`VITE_*` = public).
   Revoke, reissue, store as server-only `OPENROUTER_API_KEY` (no `VITE_`/`EXPO_PUBLIC_`). Not in
   git history (gitignore held) but treat as compromised.
2. **Server-side AI proxy** — all OpenRouter calls behind `api/ai/*` (`ask`, `extract`, `classify`).
   Mobile calls `api/ai/*` with Supabase JWT; never holds an AI key. Replace `mobile/src/lib/mockExtract.ts` call sites.
3. **Supabase Auth** — drop custom `jsonwebtoken` + `JWT_SECRET='family-ai-secret-key-2026'` fallback.
   `api/` verifies Supabase JWT, derives family_id via `auth_family_id()`.
4. **RLS on every domain table** + a CI denial test (user A's token → 0 rows from family B).
5. **Rate limiting** (`@upstash/ratelimit`) keyed by family_id: AI ask 20/min, extract 60/min, auth 5/15min/IP.
6. **zod validation** at every function entry AND on LLM JSON output before any DB write
   (replaces fragile fence-stripping). `response_format: json_object`.
7. **Supporting:** `vercel.json` security headers, Telegram webhook secret-token check, `pino`
   logging with PII redaction (emails/doc numbers/body), `envalid`/zod fail-fast env validation,
   per-family daily cost cap (80% alert / 100% soft-fail) from `llm_audit_log` + Redis counter.

---

## Roadmap

**Phase 1 — Security & Backend Foundation (blocker).** Rotate key. Provision Supabase + Vercel +
Upstash. Postgres schema + RLS + `auth_family_id()`. `api/` skeleton (auth, documents, comms,
tasks) replacing Express/SQLite. Supabase Auth wired into mobile (`mobile/src/store/auth.tsx`).
zod + rate-limit + env validation + logging. CI RLS denial test. *Stack migration + all CONCERNS criticals.*

**Phase 2 — Mobile on real backend.** Wire Expo stores to `api/` (replace fixtures + mockExtract).
Documents / School / Actions reading live data. Manual scan → `api/ai/extract` (server-side vision).
*Deliverable: app works end-to-end on real data, no mocks.*

**Phase 3 — Telegram ingestion + extraction write path.** Bot + `telegram_links` `/link` pairing.
Webhook → cheap-model extraction → structured rows + embeddings. Confirmation/undo replies.
*Deliverable: forward a school email → it's filed, tasks created, searchable.*

**Phase 4 — The agent (reactive Q&A).** `api/ai/ask` tool-calling loop + 6 tools + profile card +
pgvector `search_communications`. Chat UI in mobile. `llm_audit_log` + cost cap.
*Deliverable: "passport expiry?" / "Jolie's last result?" answered, grounded, isolated. = v1 done.*

**Phase 5+ (fast-follow, NOT v1) — Proactive engine.** Scheduler (Vercel cron) for expiry/appointment
reminders + daily digest. Weekend suggestions (activity_log + weather API → agent). Delivery via
Telegram + Expo push. Google Drive watch as 2nd ingestion channel.

---

## Risks / Flags

- **"Adjust the alarm" is not feasible** — iOS sandbox forbids 3rd-party apps setting system alarms.
  Reframe as notification/reminder (Telegram push, Expo push, or calendar event via EventKit w/ permission). Fast-follow only.
- **Verify OpenRouter tool-calling** for the chosen model before locking Phase 4 (configured slug is invalid anyway). Keep a fallback.
- **Telegram: one shared bot routed by `chat_id→family_id`** (not per-family bots). `/link` one-time code from the app. Unlinked/spoofed chat_id must never reach data.
- **pgvector + RLS**: global HNSW pre-filtered by family_id is fine at hundreds of small families; hash-partition `embeddings` if any family grows huge.
- **Intra-family permissions** (who sees a child's health/results) = app-level `users.role` in the API, not RLS (RLS is family-level).
- **Member name ambiguity** ("Yusuf" vs "Yousef", two similar kids) → tool returns `ambiguous`, model asks to clarify, never guesses.

---

## Verification

- **RLS:** automated test — family A JWT returns 0 rows from family B across all domain tables.
- **Extraction:** forward a known sample (passport photo, school email) via Telegram → assert
  correct rows in `documents`/`communications`/`tasks` + `expiry_date_source_text` substring check + embeddings written.
- **Agent:** scripted Q&A set — "passport expiry?", "Jolie's last result?", "anything to pay for
  Yusuf this week?" → assert correct tool(s) called, grounded answer, ≤4 rounds, audit row written.
- **Cost cap:** simulate spend → assert 80% alert + 100% soft-fail.
- **E2E:** mobile app login (Supabase) → see live data → ask a question → get grounded answer.
- Run mobile via Expo Go / TestFlight; run `api/` on Vercel preview; verify with Supabase MCP (`list_tables`, `get_advisors` for RLS gaps).

## Critical files
- `server/server.js`, `server/db.js` — port routes + `query` ergonomics to `api/`; drop SQLite/Express/hardcoded REFERENCE_DATE/JWT fallback.
- `mobile/src/store/auth.tsx`, `mobile/src/store/documents.tsx`, `mobile/src/lib/mockExtract.ts`, `mobile/src/data/fixtures.ts` — swap mocks for `api/` calls.
- `.planning/ROADMAP.md` — authoritative; supersedes `research/ARCHITECTURE.md`.
- `src/fixtures/hassan.js` — ground-truth data shapes for schema + zod.
- `.env` — rotate the live key, move server-side.
