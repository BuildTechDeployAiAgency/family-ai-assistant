# Phase 1: Security & Backend Foundation - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning — **but ROADMAP.md / REQUIREMENTS.md / CLAUDE.md need a refresh first (see "Upstream Doc Drift" below)**

<domain>
## Phase Boundary

A secure, family-scoped backend skeleton ready to host all v1 feature work. By end of Phase 1:

- No third-party secrets reach the browser (OpenRouter key proxied server-side)
- Every domain row is `family_id`-scoped and enforced by Postgres Row-Level Security
- Auth is delegated to a managed provider; no custom JWT/bcrypt code remains
- Server code is decomposed into validated, rate-limited, logged, helmet-headered serverless functions
- Existing SQLite data is discarded; project re-bootstraps on a fresh Postgres schema
- All v1 feature phases (Frontend Modularization, LLM Router + Drive + Vault, Telegram + Reminders + School Hub + Prod) can build on top without rewriting tenancy or auth

</domain>

<decisions>
## Implementation Decisions

### Stack Pivot (dominant decision — invalidates several locked constraints)

- **D-01: Full Supabase pivot.** SQLite is dropped. Postgres is hosted by Supabase. Custom JWT + bcrypt auth is dropped — Supabase Auth (email/password) owns user identity. Per-family tenancy is enforced by Postgres Row-Level Security policies, not by `family_id = ?` predicates inside hand-rolled repositories.
- **D-02: Backend topology = Vercel serverless functions + Supabase.** Express + Fly.io are dropped entirely. Frontend stays on Vercel; server-side code (AI proxy, Drive polling, Telegram webhook, future routes) lives in Vercel serverless functions in the same project. Scheduled work (reminder dispatch, Drive `changes.list` poll) runs via Vercel Cron, Supabase Cron, or `pg_cron` — pick the simplest per task in planning.
- **D-03: This pivot reverses the "Postgres migration in v1 → out of scope" line in REQUIREMENTS.md and the SQLite/Fly.io constraints in CLAUDE.md. Those docs MUST be updated before `/gsd:plan-phase 1` runs.** See "Upstream Doc Drift" canonical ref entry.

### Data Migration Strategy

- **D-04: Wipe and rebuild on Supabase.** `server/database.db` is deleted; no data is ported from local SQLite. POC has only Hassan seed data and ad-hoc test rows — none worth preserving. Fresh Supabase project, fresh schema.
- **D-05: Ship migrations runner from day one (DATA-06 preserved).** Use Supabase CLI migrations (`supabase/migrations/*.sql`) as the runner. Treat the initial Postgres schema as `001_initial.sql`. Phase 3 (drive_connections, llm_audit_log) and Phase 4 (reminders, telegram_chats) schema additions drop in as later numbered files. No hand-rolled boot-time SQL runner needed — Supabase CLI replaces it.

### Identity & Tenancy

- **D-06: Supabase Auth owns user identity.** Email + password for v1 (matches REQUIREMENTS.md "Auth: email/password (no OAuth providers in v1)"). Auth token = Supabase JWT; frontend uses `@supabase/supabase-js` client; serverless functions verify via `supabase.auth.getUser(token)` or by trusting the RLS-enforced anon key.
- **D-07: `family_id` lives on every domain table AND is enforced by RLS policies.** Repositories (or direct supabase-js calls) no longer carry the burden of "must include `family_id = ?`" — that's wrong by construction once RLS is on. DATA-04 (NOT NULL family_id on every domain table) still holds.
- **D-08: `family_members` table joins `auth.users` → `families`.** A Supabase auth user can belong to one family in v1 (multi-family deferred to v2 per MT-01). RLS policy template: `family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())`.

### Data Access Layer

- **D-09: Direct `@supabase/supabase-js` calls from serverless functions, no Kysely/Drizzle in v1.** Repository pattern (DATA-05) is REINTERPRETED: instead of "every query takes familyId", it becomes "every domain access goes through a thin `lib/db/{resource}.ts` module that wraps the supabase-js client and assumes RLS is in force". Raw SQL only inside Supabase migrations and `supabase.rpc()` calls when needed.
- **D-10: Service-role key used only for trusted server-side cron/webhook paths.** User-facing routes use the user's JWT (RLS-enforced). Service-role key never reaches the browser, never logs.

### Secrets, Headers, Validation, Logging, Rate Limiting (SEC-01..SEC-07)

- **D-11: SEC-09 is OBSOLETE** (no custom JWT secret). Replace with: "Supabase keys (anon, service-role) loaded from env at boot via `envalid`; missing keys fail startup." Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to the required-env set alongside `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN`.
- **D-12: `helmet`-equivalent headers in Vercel** via `next.config.js` / `vercel.json` headers config (or per-function response headers) since we're not running Express. CORS — Vercel functions are same-origin with the frontend (no CORS needed for browser→function calls); cross-origin allowlist still set for any external webhooks.
- **D-13: `zod` validates every request body at the top of each serverless function** before any DB call. Reused schemas live in `lib/schemas/`.
- **D-14: `pino` for structured logging** with PII/secret redaction; logs flush to Vercel runtime logs (or Better Stack / Logtail if structured log search needed — defer the sink choice to planning).
- **D-15: Rate limiting via Vercel's built-in limits or `@upstash/ratelimit` against Upstash Redis** on `/api/auth/*` (Supabase Auth handles login throttling natively — verify in planning) and `/api/ai/*`. Confirm in planning whether Supabase Auth's own brute-force protection makes SEC-05 partially moot for auth endpoints.

### Hassan Seed Data

- **D-16: Hassan family fixtures move to `src/fixtures/` and gate on `import.meta.env.DEV`** (per SEC-08 and FE-03 — that requirement now activates partially in Phase 1). No mock data ships in the production bundle, period. The first-run/onboarding flow (OPS-01, Phase 4) replaces seeding.

### Claude's Discretion

- Exact file layout under `api/` (Vercel functions): planner decides — flat per-resource vs nested.
- Migration file naming convention: planner follows Supabase CLI defaults unless team prefers timestamped.
- Whether to use `@supabase/ssr` helpers for cookie-based session: planner picks based on Vercel docs.
- Choice of log sink in production (Vercel runtime logs vs Logtail/Better Stack): planner recommends, user signs off in plan review.
- Whether `next.config.js` is needed at all — current stack is Vite, not Next. Planner decides: stay on Vite + Vercel serverless (`api/` directory convention), or migrate to Next.js. **Strong default: stay on Vite + `api/` dir. Next.js migration is Phase 2 territory at earliest, if ever.**

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Upstream Doc Drift (READ FIRST — these are now wrong)

- `.planning/REQUIREMENTS.md` — SEC-09 obsolete; DATA-01..11 need Postgres/RLS rewrites; "Postgres migration in v1 — out of scope" must be reversed. **Planner: surface a doc-update task before any plan tasks.**
- `.planning/ROADMAP.md` §"Phase 1 Success Criteria" — references JWT_SECRET fallback removal, Fly.io, and `server.js` decomposition; rewrite for Supabase + Vercel topology.
- `CLAUDE.md` §"Constraints" — "SQLite", "Fly.io", "Auth: email/password (custom)" lines need replacement.

### Project Specs (still authoritative for everything not invalidated above)

- `.planning/PROJECT.md` — product vision, family-AI-assistant value loop.
- `.planning/REQUIREMENTS.md` §"v1 Requirements" — 68 requirements (after edits above).
- `.planning/ROADMAP.md` — 4-phase plan.
- `.planning/STATE.md` — current session state.

### Codebase Maps

- `.planning/codebase/STACK.md` — current tech stack (about to be partially invalidated by this pivot).
- `.planning/codebase/ARCHITECTURE.md` — current architecture, single-component frontend, Express server.
- `.planning/codebase/CONCERNS.md` — security + tech-debt audit. **Every issue listed here must be resolved or explicitly deferred in Phase 1 planning.**
- `.planning/codebase/CONVENTIONS.md` — naming, code style, ESLint config.
- `.planning/codebase/STRUCTURE.md` — file layout.
- `.planning/codebase/INTEGRATIONS.md` — external services.
- `.planning/codebase/TESTING.md` — zero tests today.

### External (planner to fetch as needed)

- Supabase docs: Auth (email/password), RLS policies, CLI migrations, supabase-js client, `pg_cron`/Supabase Cron.
- Vercel docs: serverless functions with Vite (`api/` directory), Cron, environment variables, headers config, rate limiting.
- `zod`, `envalid`, `pino`, `@upstash/ratelimit` package docs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `server/db.js` — Promise wrapper around sqlite3. **Discarded** under the pivot (no Express, no sqlite3).
- `server/middleware.js` — `authenticateToken` JWT verifier. **Discarded** (Supabase Auth replaces it).
- `server/server.js` — current Express monolith with `/api/auth`, `/api/documents`, `/api/emails`, `/api/tasks`. **Discarded as code; the API surface is the only useful artifact — planner translates each route into a Vercel function.**
- `.env` schema (currently `VITE_OPENROUTER_API_KEY`, `VITE_OPENROUTER_MODEL`, `JWT_SECRET`, `PORT`) — only `OPENROUTER_API_KEY` (server-side now, drop `VITE_` prefix) survives. New required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `JWT_SECRET`, `PORT` removed.
- `.gitignore` — already covers `.env`, `*.db`, `.chrome-profile`. **No leak in git history** (verified: `git log -- .env` empty, `git log -- server/database.db` empty). **Remote (`github.com/BuildTechDeployAiAgency/family-ai-assistant`) exists but no deploys yet → OpenRouter key in `.env` was never published publicly. Rotation is hygiene-only, not emergency.**

### Established Patterns

- Per-route auth gate via `authenticateToken` middleware → replaced by Supabase JWT verification at the top of each function, OR by relying on RLS with the user's anon-key request.
- snake_case DB columns mapped to camelCase JSON in handlers → preserved (supabase-js does it automatically via column aliases or manual mapping).
- `INSERT OR REPLACE` upsert idiom → Postgres `INSERT ... ON CONFLICT DO UPDATE` (supabase-js `.upsert()`).
- 2-space indent, single quotes, semicolons on server / none on JSX — preserved.
- ESM, `"type": "module"`, relative imports with `.js`/`.jsx` extensions — preserved.

### Integration Points

- Frontend `src/App.jsx` makes `fetch('/api/...')` calls with `Authorization: Bearer ${token}` — the URL shape stays; the token becomes a Supabase JWT; the Vite dev proxy to `localhost:5000` is replaced by Vercel's local dev (`vercel dev`) serving `api/` functions directly.
- OpenRouter integration today: client-side `fetch('https://openrouter.ai/...')` with `VITE_OPENROUTER_API_KEY` (SEC-03 violator). New: `POST /api/ai/complete` (or per-action sub-routes — deferred to Phase 3) reads `OPENROUTER_API_KEY` server-side.
- Hardcoded `REFERENCE_DATE = '2026-05-19'` in `src/App.jsx:7`, `server/server.js:122,162` — Phase 1 deletes both copies; replace with `new Date().toISOString().slice(0,10)` from a single shared helper (`lib/today.js`).

</code_context>

<specifics>
## Specific Ideas

- The OpenRouter key currently in `.env` (`sk-or-v1-a731f1e7741...`) is the project's working key. Move server-side as `OPENROUTER_API_KEY`. Rotation is recommended-but-not-urgent (never published; `dist/` never deployed). Planner should still emit a "rotate this key when Supabase setup is complete" task.
- Wrong model slug `google/gemini-3.5-flash` (in `.env` AND `src/App.jsx:655,961`) is dead. LLM-08 demands a verified default + fallback chain; Phase 3 owns model selection. For Phase 1, the AI proxy is a thin passthrough — model id comes from the request body, defaulted in code to a placeholder Phase 3 will swap.
- Family-scope policy template (planner to validate): `using ( family_id IN (select family_id from family_members where user_id = auth.uid()) )` on every domain table. Same template for `for select / insert / update / delete`.

</specifics>

<deferred>
## Deferred Ideas

- **Per-family LLM cost dashboard + hard cutoff** (MT-04) — explicit v2 per REQUIREMENTS.md.
- **Multi-family user accounts** (MT-01) — explicit v2; the `family_members` table can already support it (composite or nullable design), but Phase 1 enforces "one family per user" at the policy level.
- **TypeScript migration** — out of scope per REQUIREMENTS.md "Out of Scope". Phase 1 still ships JS/JSX; Supabase-generated types optional (`supabase gen types typescript`) but consumed only in JSDoc if at all.
- **Postgres-side text search / vector search for documents** — not in v1 reqs; revisit when document corpus grows.
- **Switching from email/password to magic-link auth** — Supabase supports it free; deferred to v2 unless trivial during Phase 1 implementation.
- **AI proxy endpoint shape (single vs per-action)** — gray area not discussed this session; Phase 3 (LLM router) owns the final shape. Phase 1 ships the minimum: one authenticated `POST /api/ai/complete` proxy with rate limiting + per-family cost guard stubbed.
- **Test scaffolding (vitest + RLS-policy tests)** — gray area not discussed this session. Planner may include a minimum bootstrap (vitest + one RLS auth test proving cross-family read is denied) if cheap; otherwise defer to feature phases per REQUIREMENTS.md "Standalone test phase — out of scope".

### Reviewed Todos (not folded)

None — no GSD todos cross-referenced this session.

</deferred>

---

*Phase: 1-Security & Backend Foundation*
*Context gathered: 2026-05-21*
