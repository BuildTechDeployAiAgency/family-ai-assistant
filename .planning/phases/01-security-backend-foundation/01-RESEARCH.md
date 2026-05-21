# Phase 1: Security & Backend Foundation - Research

**Researched:** 2026-05-21
**Domain:** Supabase (Postgres + Auth + RLS) on Vercel serverless functions, with `envalid` / `zod` / `pino` hardening and `@upstash/ratelimit` for AI/auth throttling.
**Confidence:** HIGH for stack choices and architectural shape (decisions locked in CONTEXT.md). MEDIUM for exact Vite-on-Vercel `api/` ergonomics and rate-limit choice (Supabase vs Upstash for auth). LOW for whether log sink stays on Vercel runtime logs vs Logtail — explicitly deferred.

## Summary

This is a **brownfield-to-rebuild** phase. CONTEXT.md (D-01..D-16) locks a wholesale pivot away from the original Express+SQLite+Fly stack to **Supabase (Postgres+Auth+RLS) + Vercel serverless functions**. The current `server/` directory is discarded as code; only the API surface shape is salvaged. The frontend stays Vite+React.

The phase has three intertwined deliverables:

1. **Secrets hardening** — kill the client-side OpenRouter key, kill the JWT secret fallback (by killing JWT entirely; Supabase Auth owns identity), formalize env validation at boot with `envalid`, confirm `.gitignore` covers everything (it already does — verified), rotate the OpenRouter key as hygiene (never published, confirmed via `git log`).
2. **Multi-tenant data model on Postgres** — every domain row carries `family_id NOT NULL` and is gated by Row-Level Security policies. The repository pattern (DATA-05) is reinterpreted: instead of "every query takes familyId", it becomes "every domain access goes through a thin `lib/db/{resource}.js` module that calls `@supabase/supabase-js` and trusts RLS". This is structurally safer than the original plan.
3. **Server decomposition** — `server.js` is replaced by per-resource Vercel functions under `api/`. `helmet` becomes Vercel headers config (`vercel.json`); `zod` validates each function entry; `pino` structured logs; `@upstash/ratelimit` against Upstash Redis for `/api/ai/*` (Supabase Auth already throttles login natively — verify).

**Primary recommendation:** Stay on Vite (no Next.js migration). Use Vercel's `api/` directory convention. Use Supabase CLI (`supabase init`, `supabase migration new`) as the migrations runner. RLS-first tenancy. `envalid` for env validation. `zod` for request validation. `pino` for logs. `@upstash/ratelimit` for AI rate-limiting. Ship one integration test proving cross-family read is denied by RLS — this is the only test cheap enough to justify in this phase.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Full Supabase pivot.** SQLite is dropped. Postgres is hosted by Supabase. Custom JWT + bcrypt auth is dropped — Supabase Auth (email/password) owns user identity. Per-family tenancy is enforced by Postgres Row-Level Security policies, not by `family_id = ?` predicates inside hand-rolled repositories.
- **D-02: Backend topology = Vercel serverless functions + Supabase.** Express + Fly.io are dropped entirely. Frontend stays on Vercel; server-side code (AI proxy, Drive polling, Telegram webhook, future routes) lives in Vercel serverless functions in the same project. Scheduled work (reminder dispatch, Drive `changes.list` poll) runs via Vercel Cron, Supabase Cron, or `pg_cron` — pick the simplest per task in planning.
- **D-03: This pivot reverses the "Postgres migration in v1 → out of scope" line in REQUIREMENTS.md and the SQLite/Fly.io constraints in CLAUDE.md. Those docs MUST be updated before `/gsd:plan-phase 1` runs.**
- **D-04: Wipe and rebuild on Supabase.** `server/database.db` is deleted; no data is ported from local SQLite.
- **D-05: Ship migrations runner from day one (DATA-06 preserved).** Use Supabase CLI migrations (`supabase/migrations/*.sql`). Initial schema is `001_initial.sql`. Phase 3 (drive_connections, llm_audit_log) and Phase 4 (reminders, telegram_chats) schema additions drop in as later numbered files.
- **D-06: Supabase Auth owns user identity.** Email + password for v1. Auth token = Supabase JWT; frontend uses `@supabase/supabase-js` client; serverless functions verify via `supabase.auth.getUser(token)` or trust the RLS-enforced anon key.
- **D-07: `family_id` lives on every domain table AND is enforced by RLS policies.** DATA-04 (NOT NULL family_id) still holds.
- **D-08: `family_members` table joins `auth.users` → `families`.** One family per auth user in v1 (multi-family deferred to v2 per MT-01). RLS template: `family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())`.
- **D-09: Direct `@supabase/supabase-js` calls from serverless functions, no Kysely/Drizzle in v1.** DATA-05 reinterpreted: every domain access goes through a thin `lib/db/{resource}.js` module that wraps supabase-js and assumes RLS is in force. Raw SQL only inside Supabase migrations and `supabase.rpc()`.
- **D-10: Service-role key used only for trusted server-side cron/webhook paths.** User-facing routes use the user's JWT (RLS-enforced). Service-role key never reaches the browser, never logs.
- **D-11: SEC-09 OBSOLETE** (no custom JWT secret). Replace with: "Supabase keys (anon, service-role) loaded from env at boot via `envalid`; missing keys fail startup." Required env set: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN`.
- **D-12: `helmet`-equivalent headers in Vercel** via `vercel.json` headers config (or per-function response headers). CORS — Vercel functions are same-origin with the frontend (no CORS needed browser→function); cross-origin allowlist still set for external webhooks.
- **D-13: `zod` validates every request body at the top of each serverless function** before any DB call. Reused schemas in `lib/schemas/`.
- **D-14: `pino` for structured logging** with PII/secret redaction; flushes to Vercel runtime logs (Logtail/Better Stack deferred to planning).
- **D-15: Rate limiting via Vercel's built-in limits or `@upstash/ratelimit` against Upstash Redis** on `/api/auth/*` (Supabase Auth handles login throttling natively — verify in planning) and `/api/ai/*`.
- **D-16: Hassan family fixtures move to `src/fixtures/` and gate on `import.meta.env.DEV`.** No mock data in production bundle. First-run onboarding (Phase 4, OPS-01) replaces seeding.

### Claude's Discretion

- Exact file layout under `api/` (Vercel functions): flat per-resource vs nested.
- Migration file naming: Supabase CLI defaults unless timestamped preferred.
- Whether to use `@supabase/ssr` for cookie-based session.
- Log sink in production (Vercel runtime logs vs Logtail/Better Stack) — recommend, user signs off.
- Stay on Vite + `api/` dir vs migrate to Next.js. **Strong default: stay on Vite + `api/`.**

### Deferred Ideas (OUT OF SCOPE)

- Per-family LLM cost dashboard + hard cutoff (MT-04, v2).
- Multi-family user accounts (MT-01, v2). v1 enforces "one family per user" at the policy level.
- TypeScript migration (out of scope per REQUIREMENTS.md). Phase 1 ships JS/JSX.
- Postgres full-text/vector search.
- Magic-link auth (defer to v2 unless trivial during Phase 1).
- AI proxy endpoint shape (single vs per-action) — Phase 3 owns it. Phase 1 ships minimum: one authenticated `POST /api/ai/complete` proxy with rate limiting + per-family cost guard stubbed.
- Test scaffolding beyond a single RLS denial test.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Sensitive runtime config loaded via `envalid`; missing keys fail startup | Use `envalid` 8.x (verified npm 8.1.1). Build a single `lib/env.js` module called at the top of every function. |
| SEC-02 | `.env*` (except `.env.example`) and `*.db` gitignored; previously committed secrets rotated | `.gitignore` already covers both (verified). Git history clean (`git log -- .env`, `git log -- server/database.db` both empty). OpenRouter key rotation is hygiene only. |
| SEC-03 | OpenRouter API key NEVER exposed to client — all LLM via `/api/ai/*` proxy | Implement `POST /api/ai/complete` Vercel function reading `OPENROUTER_API_KEY` server-side. Verify final `dist/` bundle contains no `sk-or-` substring as gate. |
| SEC-04 | `helmet` headers + tightened CORS | Use `vercel.json` `headers` config (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy). Same-origin for browser→function; allowlist for external webhooks. |
| SEC-05 | Rate limiting on `/api/auth/*` and `/api/ai/*` | `@upstash/ratelimit` (verified npm 2.0.8) + `@upstash/redis` (1.38.0) on `/api/ai/*`. Auth login throttling is native to Supabase Auth (~30 req/5min per IP) — verify and document; add Upstash on top only if planner confirms gap. |
| SEC-06 | All API request bodies validated with `zod` | `zod` 4.4.3 (verified, MAJOR — see Pitfalls). Schemas in `lib/schemas/`. Validate at function entry before any DB call. |
| SEC-07 | Structured logging via `pino` + redaction | `pino` 10.3.1 + `pino-http` 11.0.0 (verified). Redact paths: `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.apiKey`, `*.token`. |
| SEC-08 | Hassan seed data removed from prod paths; DEV-flag only | Move from `src/App.jsx:17-378` to `src/fixtures/hassan.js`; import only behind `if (import.meta.env.DEV)`. Verify `dist/` does not contain `"Hassan"` string. |
| SEC-09 | OBSOLETE per D-11 — replaced with "Supabase keys env-validated at boot" | Covered by SEC-01 expansion. |
| DATA-01 | `families` table | Postgres `families (id uuid pk default gen_random_uuid(), name text not null, created_at timestamptz default now())`. RLS enabled. |
| DATA-02 | `family_members` table | `family_members (id uuid pk, family_id uuid fk families on delete cascade, user_id uuid fk auth.users, role text, display_name text, created_at timestamptz)`. Unique `(family_id, user_id)`. RLS policy: user can see their own membership rows. |
| DATA-03 | `children` table | `children (id uuid pk, family_id uuid fk, display_name text, aliases text[] default '{}', grade text, created_at timestamptz)`. RLS gates on family membership. |
| DATA-04 | `family_id NOT NULL` on every domain table | Enforced in initial migration. `documents`, `emails`, `tasks`, plus new tables. |
| DATA-05 | Repository pattern — REINTERPRETED per D-09 | Thin modules in `lib/db/{families,members,children,documents,emails,tasks}.js` wrapping supabase-js. Each exports named functions (e.g., `getDocumentsForFamily`, `insertDocument`). RLS provides the actual security boundary. |
| DATA-06 | Migrations folder | `supabase/migrations/001_initial.sql`. Supabase CLI runs them on `supabase db push`. Document local-dev flow with `supabase start`. |
| DATA-07 | `drive_connections` table — Phase 3 actually owns but schema can land now | Defer schema to Phase 3 OR ship empty table now with placeholder columns. Recommend defer. |
| DATA-08 | `telegram_chats` table — Phase 4 owns | Same — defer to Phase 4. |
| DATA-09 | `reminders` table with unique constraint — Phase 4 owns | Same — defer. |
| DATA-10 | `llm_audit_log` table — Phase 3 owns | Same — defer. |
| DATA-11 | `server.js` decomposed | Reinterpreted: there is no `server.js`. Decomposition = Vercel `api/` directory with one function per resource: `api/ai/complete.js`, `api/documents/index.js`, `api/documents/[id].js`, `api/emails/index.js`, `api/emails/sync.js`, `api/tasks/index.js`, plus `lib/{env,supabase,schemas,db,logger,ratelimit}/`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

CLAUDE.md still lists stale constraints that CONTEXT.md D-03 explicitly invalidates:

- "Tech stack: Vite + React 19, Express 5, SQLite" — **partially obsolete**. Vite + React 19 stays. Express + SQLite dropped.
- "Hosting: Vercel (frontend) + Fly.io (backend + SQLite volume)" — **obsolete**. Fly.io dropped; backend = Vercel functions.
- "AI provider: OpenRouter" — still authoritative.
- "Chat platform: Telegram only for v1" — still authoritative.
- "Cloud drive: Google Drive only for v1" — still authoritative.
- "Auth: email/password (no OAuth providers in v1)" — **stays**, but implementation pivots: Supabase Auth email/password, not custom JWT/bcrypt.
- "Scope: single-family POC — no multi-tenant isolation work in v1, but data model should not block it later" — **honored** by `families`/`family_members` schema + RLS.
- "Phase 1 must fix all critical concerns from `.planning/codebase/CONCERNS.md` before any feature work" — **honored**: every concern is addressed or explicitly deferred below in "Concerns → Resolution Map".

**Action required before planning starts:** Update REQUIREMENTS.md, ROADMAP.md, CLAUDE.md per D-03. The planner must surface this as a precondition task.

**GSD workflow rule (CLAUDE.md): "Do not make direct repo edits outside a GSD workflow."** — All code changes in Phase 1 must flow through `/gsd:execute-phase` after planning.

**File conventions to preserve (CLAUDE.md):** 2-space indent, single quotes, server uses semicolons / JSX omits trailing semicolons (match the file). ESM throughout. Relative imports with explicit `.js`/`.jsx` extensions. snake_case in DB, camelCase in JSON responses.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User identity / sessions | Supabase Auth (managed) | Browser (token storage via `@supabase/supabase-js`) | Managed identity provider; no custom auth code. |
| Per-family tenancy enforcement | Postgres (RLS policies) | `lib/db/*` thin wrappers (defense-in-depth) | RLS is the security boundary; JS wrappers are ergonomic, not authoritative. |
| Request body validation | Vercel serverless function entry | `lib/schemas/*.js` | Validate before any DB or LLM call; reject 400 fast. |
| Secrets loading | Module-load time (`lib/env.js`) | — | Fail fast: throw at import if env missing. |
| OpenRouter LLM proxy | Vercel function (`api/ai/complete.js`) | Upstash Redis (rate limit state) | Key must never leave server; per-family rate cap is server-only. |
| Static frontend serving | Vercel CDN | — | Vite `dist/` deployed as static; no Express. |
| Domain CRUD | Vercel function (`api/{resource}/*.js`) | Postgres (RLS-gated) | Each resource is one function file. |
| Migrations | Supabase CLI (developer machine + CI) | `supabase/migrations/*.sql` | No boot-time runner; CLI handles env-specific pushes. |
| Rate limiting | Upstash Redis (via `@upstash/ratelimit`) | Supabase Auth native (for login throttling) | Stateful across serverless invocations; Upstash is the only practical option for cold-start serverless. |
| Structured logging | `pino` instance per function | Vercel runtime logs (default sink) | JSON lines visible in Vercel dashboard; upgrade path to Logtail/Better Stack later. |
| Security headers | `vercel.json` `headers` config | Per-function response headers (where dynamic) | Static headers configured once at deploy; avoid forgetting on a new route. |
| CSRF / same-origin protection | Browser SOP + Supabase JWT in Authorization header | — | Same-origin between frontend and `/api/*`; no cookies in v1 unless `@supabase/ssr` adopted. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.106.1 | Postgres client + Auth client | Official Supabase JS SDK. Used identically from browser and Vercel functions. [VERIFIED: npm registry] |
| `supabase` (CLI) | 2.100.1 | Local Postgres dev, migrations, type gen | Official CLI. Required for `supabase init`, `supabase migration new`, `supabase db push`. [VERIFIED: npm registry] |
| `envalid` | 8.1.1 | Boot-time env validation with typed accessors | De facto standard for Node env validation. Throws on missing/malformed. [VERIFIED: npm registry] |
| `zod` | 4.4.3 | Runtime schema validation for request bodies | Standard choice for typed schema validation in JS/TS. **WARNING: v4 has breaking API changes vs v3 — see Pitfalls.** [VERIFIED: npm registry] |
| `pino` | 10.3.1 | Structured JSON logger | Standard high-performance Node logger. Native PII redaction via `redact` paths. [VERIFIED: npm registry] |
| `@upstash/ratelimit` | 2.0.8 | Distributed rate limiter for serverless | Designed for edge/serverless; stateless function calls share state via Redis. [VERIFIED: npm registry] |
| `@upstash/redis` | 1.38.0 | HTTP-based Redis client (no TCP) | Pairs with `@upstash/ratelimit`. HTTP works in serverless cold-starts; ioredis does not. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | 0.10.3 | Cookie-based Supabase session for frameworks | Only if planner adopts cookie auth (deferred decision per D-11). [VERIFIED: npm registry] |
| `pino-http` | 11.0.0 | Express/connect middleware for pino | Use only inside per-function handlers; not strictly required since each Vercel function is a single handler. [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `envalid` | `zod` env schema | Could share zod everywhere; envalid is lighter & purpose-built. Pick one — recommend envalid for env, zod for request bodies (CONTEXT.md picks both). |
| `@supabase/supabase-js` direct | Drizzle / Kysely + Postgres driver | More type safety, more lock-in, more code. Explicitly rejected in D-09. |
| `@upstash/ratelimit` | `express-rate-limit` | `express-rate-limit` requires in-memory or external store; in serverless each cold start has empty memory → useless. Upstash designed for this. |
| `pino` | `winston` | `winston` is slower, larger; `pino` is the modern default for high-throughput Node. |
| Vite + `api/` | Next.js | Next.js migration is its own multi-day phase. CONTEXT.md strong default: stay on Vite. |

**Installation:**
```bash
npm install @supabase/supabase-js envalid zod pino @upstash/ratelimit @upstash/redis
npm install --save-dev supabase pino-pretty
# Optional, deferred decision:
# npm install @supabase/ssr pino-http
```

**Version verification:** All versions above verified via `npm view <pkg> version` on 2026-05-21. Pin exact versions in `package.json` (drop `^` prefix) per CONCERNS.md "Bleeding-edge versions" risk.

## Package Legitimacy Audit

slopcheck v0.10.0 ran successfully against all proposed packages. Result:

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@supabase/supabase-js` | npm | ~5 yrs | very high | supabase/supabase-js | [OK] | Approved |
| `@supabase/ssr` | npm | ~2 yrs | high | supabase/auth-helpers | [OK] | Approved |
| `envalid` | npm | ~8 yrs | high | af/envalid | [OK] | Approved |
| `zod` | npm | ~5 yrs | very high | colinhacks/zod | [OK] | Approved |
| `pino` | npm | ~9 yrs | very high | pinojs/pino | [OK] | Approved |
| `pino-http` | npm | ~7 yrs | high | pinojs/pino-http | [OK] | Approved |
| `@upstash/ratelimit` | npm | ~3 yrs | high | upstash/ratelimit-js | [OK]* | Approved with note |
| `@upstash/redis` | npm | ~3 yrs | high | upstash/upstash-redis | [OK] | Approved |
| `supabase` (CLI) | npm | ~4 yrs | high | supabase/cli | [OK] | Approved |

*slopcheck note on `@upstash/ratelimit`: "No source repository linked" in the registry manifest — repo exists at `github.com/upstash/ratelimit-js` but the `package.json` `repository` field may be missing/incorrect. Verdict remains [OK]. No action needed; package is from a known vendor (Upstash) with their `@upstash/redis` companion package showing the same provenance.

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none (the `@upstash/ratelimit` repo-link note is informational only).

## Architecture Patterns

### System Architecture Diagram

```
                              ┌──────────────────────────┐
                              │  Browser (React 19 SPA)  │
                              │  Vite build, served via  │
                              │  Vercel static hosting   │
                              └────────────┬─────────────┘
                                           │
                  ┌────────────────────────┼────────────────────────┐
                  │                        │                        │
                  ▼                        ▼                        ▼
       ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
       │ Supabase Auth       │  │ Vercel /api/*       │  │ Static assets / CDN │
       │ (login/register)    │  │ serverless functions│  │                     │
       │ direct from browser │  │                     │  │                     │
       │ via supabase-js     │  │ - api/ai/complete   │  │                     │
       └──────────┬──────────┘  │ - api/documents/*   │  │                     │
                  │             │ - api/emails/*      │  │                     │
                  │             │ - api/tasks/*       │  │                     │
                  │             └─────┬───────────────┘  │                     │
                  │ JWT               │                  │                     │
                  └─────► validated by│                  │                     │
                         each fn via  │                  │                     │
                         supabase.auth│                  │                     │
                         .getUser()   │                  │                     │
                                      │                  │                     │
                  ┌───────────────────┼──────────────────┘                     │
                  ▼                   ▼                                        │
       ┌─────────────────────┐  ┌─────────────────────┐                        │
       │ Postgres (Supabase) │  │ OpenRouter API      │                        │
       │  - RLS policies     │  │ (server-side calls  │                        │
       │  - migrations via   │  │  only, key from env)│                        │
       │    supabase CLI     │  └─────────────────────┘                        │
       └─────────────────────┘                                                 │
                                                                               │
       ┌─────────────────────┐                                                 │
       │ Upstash Redis       │ ◄───── @upstash/ratelimit (per-IP, per-family)  │
       │ (rate-limit store)  │        on /api/ai/* and (if needed) /api/auth/* │
       └─────────────────────┘                                                 │
```

Data flow for a document fetch:
1. Browser holds Supabase session (JWT in `localStorage` under `supabase.auth.token` by default).
2. `fetch('/api/documents', { headers: { Authorization: 'Bearer ' + jwt } })`.
3. Vercel function at `api/documents/index.js`: `envalid` env loaded at module scope → `zod` validates query → `lib/supabase.js` creates a per-request client bound to the user's JWT → `lib/db/documents.js#listForUser()` runs `supabase.from('documents').select('*')` → RLS filters by `family_id IN (...)` automatically → JSON returned.

Data flow for an LLM call:
1. Browser POSTs to `/api/ai/complete` with `{ messages, model? }`.
2. Function: env loaded → `zod` validates body → `@upstash/ratelimit` checks per-family quota → user identity confirmed via `supabase.auth.getUser(jwt)` → call OpenRouter with server `OPENROUTER_API_KEY` → return response.

### Recommended Project Structure

```
.
├── api/                          # Vercel serverless functions (one file per HTTP entry)
│   ├── ai/
│   │   └── complete.js           # POST: server-side OpenRouter proxy
│   ├── documents/
│   │   ├── index.js              # GET (list), POST (create)
│   │   └── [id].js               # GET/PUT/DELETE single doc
│   ├── emails/
│   │   ├── index.js
│   │   └── sync.js               # POST (bulk upsert)
│   └── tasks/
│       ├── index.js
│       └── [id].js
├── lib/                          # Shared backend code (imported by api/*)
│   ├── env.js                    # envalid: SUPABASE_URL, SUPABASE_ANON_KEY,
│   │                             #   SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY,
│   │                             #   (deferred-to-later-phase: GOOGLE_*, TELEGRAM_*)
│   ├── supabase.js               # Two clients: anon (for user-JWT requests) +
│   │                             #   service-role (for trusted cron/webhooks only)
│   ├── logger.js                 # pino instance with redact paths
│   ├── ratelimit.js              # @upstash/ratelimit instances per route family
│   ├── schemas/                  # zod schemas (per resource)
│   │   ├── ai.js
│   │   ├── documents.js
│   │   ├── emails.js
│   │   └── tasks.js
│   ├── db/                       # Thin per-resource wrappers (DATA-05 reinterpreted)
│   │   ├── families.js
│   │   ├── members.js
│   │   ├── children.js
│   │   ├── documents.js
│   │   ├── emails.js
│   │   └── tasks.js
│   └── today.js                  # Single source of "now" (replaces REFERENCE_DATE)
├── supabase/
│   ├── config.toml               # `supabase init` output
│   ├── migrations/
│   │   └── 20260521000000_initial.sql   # families, family_members, children,
│   │                                    #   documents, emails, tasks + RLS policies
│   └── seed.sql                  # OPTIONAL: dev-only fixtures (NOT shipped)
├── src/                          # Frontend (unchanged this phase except secrets removal)
│   ├── App.jsx                   # Still 3,643 lines — Phase 2 owns decomposition
│   ├── fixtures/
│   │   └── hassan.js             # Moved from App.jsx, gated on import.meta.env.DEV
│   └── lib/
│       └── supabase.js           # Browser Supabase client (anon key only)
├── vercel.json                   # Security headers, function config, cron (if used)
├── .env.example                  # All required env vars documented (no real values)
└── package.json                  # Express + sqlite3 + bcryptjs + jsonwebtoken REMOVED
```

### Pattern 1: Envalid Boot-Time Validation

**What:** Validate every required env var at module load. Throw on missing/malformed.
**When to use:** At the entry of every serverless function via `lib/env.js`.

```javascript
// lib/env.js
// Source: envalid README https://github.com/af/envalid (verified ecosystem-standard)
import { cleanEnv, str, url } from 'envalid';

export const env = cleanEnv(process.env, {
  SUPABASE_URL: url(),
  SUPABASE_ANON_KEY: str(),
  SUPABASE_SERVICE_ROLE_KEY: str(),
  OPENROUTER_API_KEY: str(),
  UPSTASH_REDIS_REST_URL: url(),
  UPSTASH_REDIS_REST_TOKEN: str(),
});
```

Every function imports `env` from this module. If a key is missing, the function fails on cold start — Vercel returns 500 and the deploy is effectively broken until env is fixed. **This is the desired behavior** for SEC-01 ("fail startup on missing keys").

### Pattern 2: Two-Client Supabase Setup (D-09 + D-10)

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// User-context client: bound to a request's JWT, RLS-enforced
export function userClient(jwt) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Service-role client: bypasses RLS — use ONLY in trusted server-side paths
// (cron jobs, Telegram webhook handler, never user-triggered routes)
export function serviceClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

Pattern: extract JWT from `Authorization` header in the function → pass to `userClient(jwt)` → all queries through that client are automatically filtered by RLS using `auth.uid()`.

### Pattern 3: Function Entry Validation + Logging

```javascript
// api/documents/index.js
import { env } from '../../lib/env.js';   // throws at cold-start if env missing
import { userClient } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { documentCreateSchema } from '../../lib/schemas/documents.js';
import { listDocuments, createDocument } from '../../lib/db/documents.js';

export default async function handler(req, res) {
  const jwt = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!jwt) return res.status(401).json({ error: 'unauthorized' });

  const sb = userClient(jwt);

  if (req.method === 'GET') {
    const { data, error } = await listDocuments(sb);
    if (error) { logger.error({ err: error }, 'list documents failed'); return res.status(500).json({ error: 'internal' }); }
    return res.json(data);
  }

  if (req.method === 'POST') {
    const parsed = documentCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation', issues: parsed.error.issues });
    const { data, error } = await createDocument(sb, parsed.data);
    if (error) { logger.error({ err: error }, 'create document failed'); return res.status(500).json({ error: 'internal' }); }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'method not allowed' });
}
```

### Pattern 4: RLS Policy Template (locked by D-08)

```sql
-- supabase/migrations/20260521000000_initial.sql (excerpt)
-- Source: Supabase docs https://supabase.com/docs/guides/database/postgres/row-level-security
alter table public.documents enable row level security;

create policy "family members can read their family's documents"
  on public.documents for select
  using (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
  );

create policy "family members can insert into their family"
  on public.documents for insert
  with check (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
  );

create policy "family members can update their family's documents"
  on public.documents for update
  using (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
  );

create policy "family members can delete their family's documents"
  on public.documents for delete
  using (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
  );
```

Repeat for `emails`, `tasks`, `children`. `family_members` itself: user can see their own membership rows only.

### Pattern 5: Upstash Rate Limit

```javascript
// lib/ratelimit.js
// Source: Upstash docs https://github.com/upstash/ratelimit-js
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from './env.js';

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export const aiLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),  // 20 LLM calls per minute per identifier
  analytics: true,
});

// Use in api/ai/complete.js:
//   const { success } = await aiLimit.limit(`family:${familyId}`);
//   if (!success) return res.status(429).json({ error: 'rate limited' });
```

### Pattern 6: Pino with PII/Secret Redaction

```javascript
// lib/logger.js
// Source: pino docs https://getpino.io/#/docs/redaction
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.apiKey',
      '*.token',
      '*.access_token',
      '*.refresh_token',
      '*.OPENROUTER_API_KEY',
      '*.SUPABASE_SERVICE_ROLE_KEY',
    ],
    censor: '[REDACTED]',
  },
});
```

### Pattern 7: vercel.json Security Headers (replaces helmet)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co; script-src 'self'; style-src 'self' 'unsafe-inline'" }
      ]
    }
  ]
}
```

CSP needs tuning during dev — start with `Content-Security-Policy-Report-Only` to capture violations without breaking the app, then promote to enforcing.

### Anti-Patterns to Avoid

- **Reaching for service-role key in user-facing routes.** Defeats RLS entirely. Use it ONLY in cron jobs and webhook handlers where there is no user JWT.
- **Putting RLS-bypass `from('...').select('*')` calls inside `lib/db/*` "for convenience".** The wrapper must use the user client passed in; never create a fresh service client inside a wrapper.
- **Stuffing all functions into a single `api/index.js` router.** Vercel scales functions independently; one-file-per-route is the convention.
- **Caching the Supabase client at module scope keyed to a user.** Cold starts may reuse warm instances across users; always create the user client per request with the request's JWT.
- **Logging the request body verbatim.** Bodies contain emails, document content, etc. Log only the path, method, status, latency, and request ID.
- **Reading env via `process.env.X` scattered across files.** Always go through `lib/env.js` so envalid catches missing values.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email/password auth, session JWTs, password hashing | Custom bcrypt+JWT (current code) | Supabase Auth | D-01 locks this. Custom auth has 12+ documented failure modes (CONCERNS.md). |
| Per-tenant row scoping | `WHERE family_id = ?` in every query | Postgres RLS policies | One missed `WHERE` = data leak. RLS makes it impossible at the DB layer. |
| Migration runner | Boot-time SQL execution loop | Supabase CLI | Idempotency, rollback, environment promotion all handled. |
| Env validation | `if (!process.env.X) throw` boilerplate | `envalid` | Typed accessors, default values, dev/test/prod overrides, single failure point. |
| Request validation | `if (!body.x || typeof body.x !== 'string')` | `zod` schemas | One source of truth; client and server can share schemas. |
| Rate limiting in serverless | In-memory counters (won't work across cold starts) | `@upstash/ratelimit` + Upstash Redis | Stateless serverless requires external state. Upstash is HTTP-based, no TCP pool. |
| Distributed structured logging | Hand-rolled JSON formatting | `pino` + redact paths | Performance, ecosystem, PII redaction built-in. |
| Security headers | Per-route `res.setHeader` | `vercel.json` headers config | Set once at deploy; harder to forget on a new route. |

**Key insight:** Every item in this list represents a CONCERNS.md security gap. Hand-rolling any of them re-creates the gap.

## Runtime State Inventory

Phase 1 wipes local SQLite (`server/database.db`) per D-04 — no data migration. However, since this phase **rotates** secrets and **moves** the OpenRouter integration server-side, runtime state matters:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `server/database.db` (40KB, local-only, never committed — verified `git log -- server/database.db` empty). Hassan family fixtures inside `src/App.jsx:17-378` auto-seeded for every new user. | **Delete** `server/database.db`. **Move** fixtures to `src/fixtures/hassan.js` behind `import.meta.env.DEV`. No data migration to Supabase. |
| Live service config | None — no deployed Supabase project yet, no Vercel project yet, no Upstash Redis yet. | Create all three during this phase. Document project IDs in `.env.example` comments. |
| OS-registered state | None. No cron jobs, no launchd, no systemd. `concurrently` in `npm run dev` is the only process orchestration. | None. |
| Secrets/env vars | `.env` contains `VITE_OPENROUTER_API_KEY` (currently `sk-or-v1-a731f1e7741...`), `VITE_OPENROUTER_MODEL` (wrong slug `google/gemini-3.5-flash`), `JWT_SECRET`, `PORT`. Confirmed `.env` NOT in git history. | **Drop** `VITE_` prefix on OpenRouter key (move to `OPENROUTER_API_KEY` server-only). **Remove** `JWT_SECRET`, `PORT`. **Add** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. **Rotate** OpenRouter key as hygiene (never leaked but assume exposure). **Create** `.env.example` documenting all required keys. |
| Build artifacts / installed packages | `dist/` exists locally (gitignored). Contains baked-in `VITE_OPENROUTER_API_KEY` from previous builds. `node_modules/` has Express/SQLite/bcryptjs/jsonwebtoken — to be uninstalled. | **Delete** `dist/` and rebuild only after secret moves server-side. **Uninstall** Express, sqlite3, bcryptjs, jsonwebtoken, cors. **Install** Supabase + envalid + zod + pino + upstash packages. |

**Canonical question answered:** After every file is updated, the only remaining runtime state is (1) the user's browser `localStorage` (cleared on next Supabase login since the key changes from `family_jwt_token` to `sb-<project>-auth-token`), and (2) the local `dist/` bundle which must be deleted to flush the old VITE_-baked secret. Nothing else carries forward.

## Concerns → Resolution Map

Every issue in `.planning/codebase/CONCERNS.md` mapped to a Phase 1 outcome (per CLAUDE.md "Phase 1 must fix all critical concerns"):

| Concern | Resolution in Phase 1 | Deferred? |
|---------|----------------------|-----------|
| Monolithic frontend component (App.jsx 3,643 lines) | — | **Deferred to Phase 2 (FE-01..05).** |
| Inline mock data (Hassan family) | Moved to `src/fixtures/`, DEV-gated (SEC-08, D-16). | No |
| Monolithic Express server | Replaced by Vercel `api/` directory (DATA-11). | No |
| Dual persistence (localStorage + SQLite) | SQLite gone. Frontend uses Supabase as source of truth. localStorage limited to Supabase's own session storage. | No |
| Hardcoded `REFERENCE_DATE` | Replaced with `lib/today.js` returning live date. | No |
| `syncInitialData` fake task hack | Function removed entirely with SQLite/server.js. | No |
| Wrong default LLM model | Phase 3 owns model selection (LLM-08). Phase 1 ships placeholder. | **Deferred to Phase 3.** |
| Server date hardcoded | Same fix as REFERENCE_DATE. | No |
| Token leak via incomplete localStorage cleanup | Supabase Auth manages its own storage; `supabase.auth.signOut()` clears it. | No |
| Hardcoded JWT secret fallback | JWT entirely removed (D-01). | No |
| `.env` not in `.gitignore` | Already fixed in `.gitignore`; verified. | No |
| `*.db` not in `.gitignore` | Already fixed; verified. | No |
| OpenRouter API key in browser | Moved server-side to `/api/ai/complete` (SEC-03). | No |
| No rate limiting | `@upstash/ratelimit` on `/api/ai/*`; Supabase Auth native on login (verify). | No |
| CORS wide open | Same-origin (no CORS needed for browser→/api/*); allowlist for webhooks. | No |
| No input validation | `zod` schemas at every function entry (SEC-06). | No |
| `express.json({ limit: '10mb' })` | Vercel default body limit (4.5MB hobby, 50MB pro for function payload) — accept default, no 10MB needed. | No |
| No HTTPS / security headers | `vercel.json` headers (SEC-04). HTTPS forced by Vercel. | No |
| JWT in localStorage | Supabase Auth defaults to localStorage — known browser-storage tradeoff; cookie auth via `@supabase/ssr` is the planner's discretion call. **Recommend: stay localStorage for v1**, revisit when XSS surface area grows. | Partially deferred |
| No password strength requirements | Configure Supabase Auth password policy (project settings → Auth → Password requirements). Min length 12, complexity per Supabase options. | No |
| Stack traces logged to stdout | `pino` with redaction routes through Vercel runtime logs (SEC-07). | No |
| Single-component perf | — | **Deferred to Phase 2.** |
| Sequential POST loop in syncInitialData | Function removed with SQLite. | No |
| Sequential `INSERT OR REPLACE` in /api/emails/sync | Replaced by Postgres `upsert` (single round trip). | No |
| No SQLite indexes | Postgres replaces SQLite; indexes defined in initial migration on `family_id` for every domain table. | No |
| Initial-data seeding fragile useEffect | Removed when fixtures move out. | No |
| `callAI` JSON parsing fragile | Phase 3 (LLM-03) owns `response_format: json_object`. Phase 1 just proxies. | **Deferred to Phase 3.** |
| Auth useEffect dependency churn | Replaced by Supabase Auth's `onAuthStateChange` subscription. | No |
| SQLite single-file scaling | Postgres replaces it. | No |
| No connection pooling, no graceful shutdown | Supabase manages it. | No |
| Bleeding-edge package versions | Audit + pin during install (drop `^` for new packages). React/Vite versions are Phase 2 concern. | Partially (pin Phase 1 additions; React/Vite stays as-is) |
| No `npm audit` / dependency scanning | Enable GitHub Dependabot config (`.github/dependabot.yml`) — small task in Phase 1. | No |
| No logout endpoint | Supabase Auth provides `signOut()`. | No |
| No password reset | Supabase Auth provides password reset via email magic link. | No |
| No email verification | Supabase Auth project setting (Auth → Email → Confirm email). | No |
| No HTTPS / production config | Vercel-managed. | No |
| No structured error handling middleware | Each function handles its own; pino logs. Central error handler not needed for serverless. | No |
| No request logging | pino-http per function (or inline pino logging at entry/exit). | No |
| Zero tests | Ship ONE integration test: spin up Supabase locally (`supabase start`), create two families, prove user A cannot read family B's documents (RLS denial test). Per CONTEXT.md "Test scaffolding" deferred decision — recommend the single RLS test. | Partially (one cheap RLS test) |
| Missing `README.md` / `.env.example` | Create `.env.example` (small Phase 1 task). README update can defer. | Partially |
| `.chrome-profile/` dead directory | Delete in `.gitignore` already; remove the directory. | No |

## Common Pitfalls

### Pitfall 1: Zod v4 Breaking Changes

**What goes wrong:** Code copied from zod v3 tutorials uses `.merge()`, `.deepPartial()`, `.passthrough()` which are removed/renamed in zod v4. `z.string().nonempty()` is removed in favor of `.min(1)`. `safeParse` error structure changed.
**Why it happens:** Zod v4 shipped in 2025 with substantial API cleanup. Most tutorials/blog posts predate it.
**How to avoid:** Read https://zod.dev/v4 migration guide before writing schemas. Pin zod version exactly. When in doubt, consult the v4 docs directly, not Stack Overflow.
**Warning signs:** TypeScript/JSDoc errors on `.merge()`, runtime errors `parsed.error.issues` undefined.

### Pitfall 2: Cold Start Env Throws Silently Failing on Vercel

**What goes wrong:** A missing env var causes `envalid` to throw at module-load. On Vercel, this manifests as 500 errors with cryptic "FUNCTION_INVOCATION_FAILED" — not the clear "missing OPENROUTER_API_KEY" message.
**Why it happens:** Vercel logs the throw but the surfaced error in the response is generic.
**How to avoid:** Always check Vercel function logs after first deploy. Add a `/api/health` endpoint that imports `env` so a missing var is detected by a healthcheck, not in a user request.
**Warning signs:** Every function returns 500 immediately after a deploy; Vercel logs show stack traces in `env.js`.

### Pitfall 3: Service-Role Key Accidentally in Browser

**What goes wrong:** Developer prefixes `SUPABASE_SERVICE_ROLE_KEY` with `VITE_` "to make it available" — Vite inlines it into the public bundle, defeating all RLS.
**Why it happens:** Pattern muscle memory from VITE_OPENROUTER_API_KEY mistake.
**How to avoid:** Lint rule or grep gate in CI: fail build if `VITE_*SERVICE*` or `VITE_*SECRET*` appears anywhere. Browser `src/lib/supabase.js` MUST use anon key only.
**Warning signs:** Grep for `service` in `dist/` returns a UUID-shaped string.

### Pitfall 4: RLS Recursive Policy Performance

**What goes wrong:** The policy `family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())` runs the subquery on every row scan. With many rows it gets slow.
**Why it happens:** Postgres planner doesn't always cache subquery results in RLS contexts.
**How to avoid:** Wrap `auth.uid()` calls in `(select auth.uid())` to encourage initplan caching, per Supabase docs. Add index on `family_members(user_id, family_id)`.
**Warning signs:** Query latency creeps up as rows grow; `EXPLAIN ANALYZE` shows nested loop on `family_members`.

### Pitfall 5: Supabase Auth Login Throttling Already Exists

**What goes wrong:** Planner installs Upstash rate limiting on `/api/auth/login` not realizing Supabase Auth handles brute-force throttling natively. Wasted work + extra moving part.
**Why it happens:** SEC-05 says "rate limit on /api/auth/*" but with Supabase Auth there is no `/api/auth/*` we own — login goes browser→Supabase directly.
**How to avoid:** Verify Supabase Auth rate-limit defaults (~30 req/5min per IP for sign-ins). Document the native limit; only add Upstash on top if planner identifies a gap.
**Warning signs:** Plan tasks list says "implement rate limiting on /api/auth/login" — there is no such route in this architecture.

### Pitfall 6: `@supabase/ssr` Required for Cookie Auth (Or Not)

**What goes wrong:** Adopting cookie auth without `@supabase/ssr` breaks session refresh; adopting it with Vite (not Next.js) requires custom plumbing.
**Why it happens:** `@supabase/ssr` is designed primarily for Next.js / Remix / SvelteKit; Vite SPA is not a primary target.
**How to avoid:** **Recommend skipping cookie auth in v1.** Use Supabase Auth's default localStorage. CONCERNS.md "JWT in localStorage" is a known v1 tradeoff. Revisit when XSS attack surface (rich text input, third-party scripts) grows.
**Warning signs:** Planner reaches for `@supabase/ssr` "just in case" — push back unless cookie auth is a hard requirement.

### Pitfall 7: Vite Bundle Verification Step Missing

**What goes wrong:** Phase ships without verifying the production bundle is actually free of secrets.
**Why it happens:** Code change to remove `VITE_OPENROUTER_API_KEY` from `src/App.jsx` lands, but a leftover reference or a stale dist/ keeps the key alive.
**How to avoid:** Add an explicit verification task: `npm run build && ! grep -r "sk-or-" dist/ && ! grep -r "Hassan" dist/`. This is the SEC-03 + SEC-08 acceptance gate.
**Warning signs:** No grep-based verification task in the plan.

### Pitfall 8: Supabase CLI Migration Order

**What goes wrong:** Two developers create migrations on the same day; timestamp-prefixed filenames collide or apply in wrong order.
**Why it happens:** Supabase CLI uses `YYYYMMDDHHMMSS_name.sql` prefixes; two `supabase migration new` calls on the same minute can collide.
**How to avoid:** Single-developer phase right now. Document the rule: `supabase migration new <name>` (CLI generates the timestamp). Never hand-write the prefix.
**Warning signs:** Two migrations with identical timestamps.

## Code Examples

Verified patterns from official sources:

### Initial Migration Skeleton

```sql
-- supabase/migrations/20260521000000_initial.sql
-- Source: Supabase docs https://supabase.com/docs/guides/database/postgres/row-level-security
-- and https://supabase.com/docs/guides/database/postgres/triggers

-- Enable extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ===== Tenancy =====

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.families enable row level security;

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',          -- 'owner' | 'member'
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);
create index idx_family_members_user on public.family_members(user_id);
create index idx_family_members_family on public.family_members(family_id);
alter table public.family_members enable row level security;

create policy "members can see their own membership rows"
  on public.family_members for select
  using (user_id = (select auth.uid()));

create policy "members can see family rows they belong to"
  on public.families for select
  using (
    id in (select family_id from public.family_members where user_id = (select auth.uid()))
  );

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null,
  aliases text[] not null default '{}',
  grade text,
  created_at timestamptz not null default now()
);
create index idx_children_family on public.children(family_id);
alter table public.children enable row level security;

-- ===== Domain tables (carry-forward from SQLite, plus family_id) =====

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  category text,
  document_number text,
  member_id uuid references public.family_members(id),
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_documents_family on public.documents(family_id);
alter table public.documents enable row level security;

create table public.emails (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  subject text,
  sender text,
  received_at timestamptz,
  read boolean not null default false,
  has_attachment boolean not null default false,
  processed boolean not null default false,
  body_excerpt text,
  created_at timestamptz not null default now()
);
create index idx_emails_family on public.emails(family_id);
alter table public.emails enable row level security;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  assignee text,
  category text,
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_tasks_family on public.tasks(family_id);
alter table public.tasks enable row level security;

-- ===== RLS policy template applied to each domain table =====
-- (Repeat for emails, tasks, children)

create policy "family members read documents" on public.documents for select
  using (family_id in (select family_id from public.family_members where user_id = (select auth.uid())));
create policy "family members insert documents" on public.documents for insert
  with check (family_id in (select family_id from public.family_members where user_id = (select auth.uid())));
create policy "family members update documents" on public.documents for update
  using (family_id in (select family_id from public.family_members where user_id = (select auth.uid())));
create policy "family members delete documents" on public.documents for delete
  using (family_id in (select family_id from public.family_members where user_id = (select auth.uid())));

-- Repeat the four-policy block for: emails, tasks, children, family_members (insert/update/delete only own rows)
```

### Thin Repository Wrapper

```javascript
// lib/db/documents.js
// Pattern: every function takes a per-request supabase client (which carries the user's JWT)
// and returns the supabase-js result directly. RLS does the security work.

export async function listDocuments(sb) {
  return await sb
    .from('documents')
    .select('id, family_id, title, category, expiry_date, member_id, notes, created_at')
    .order('expiry_date', { ascending: true, nullsFirst: false });
}

export async function createDocument(sb, payload) {
  // family_id must be set by the caller (typically the user's own family).
  // RLS will reject inserts where family_id is not in the user's families.
  return await sb.from('documents').insert(payload).select().single();
}

export async function updateDocument(sb, id, patch) {
  return await sb.from('documents').update(patch).eq('id', id).select().single();
}

export async function deleteDocument(sb, id) {
  return await sb.from('documents').delete().eq('id', id);
}
```

### Single RLS Denial Test (recommended one test for Phase 1)

```javascript
// test/rls.test.js  (run with `node --test` — no test framework dep needed)
// Requires: `supabase start` running locally
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

test('cross-family document read is denied by RLS', async () => {
  const svc = createClient(URL, SERVICE);

  // Setup: two families, two users, one doc each.
  const { data: famA } = await svc.from('families').insert({ name: 'A' }).select().single();
  const { data: famB } = await svc.from('families').insert({ name: 'B' }).select().single();

  const userA = await svc.auth.admin.createUser({ email: 'a@test.local', password: 'AAaa11!!aaAA', email_confirm: true });
  const userB = await svc.auth.admin.createUser({ email: 'b@test.local', password: 'BBbb22!!bbBB', email_confirm: true });

  await svc.from('family_members').insert([
    { family_id: famA.id, user_id: userA.data.user.id, display_name: 'A' },
    { family_id: famB.id, user_id: userB.data.user.id, display_name: 'B' },
  ]);

  await svc.from('documents').insert([
    { family_id: famA.id, title: "A's doc" },
    { family_id: famB.id, title: "B's doc" },
  ]);

  // Sign in as user A
  const a = createClient(URL, ANON);
  await a.auth.signInWithPassword({ email: 'a@test.local', password: 'AAaa11!!aaAA' });

  const { data } = await a.from('documents').select('title');
  assert.deepEqual(data.map(d => d.title), ["A's doc"], 'user A must see only A\'s doc, not B\'s');
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `express-rate-limit` in-memory | `@upstash/ratelimit` + Redis HTTP | Serverless became dominant ~2022 | Required for stateless functions; in-memory counters reset every cold start. |
| Custom JWT + bcrypt | Managed Auth (Supabase / Clerk / Auth0) | 2020+ | Removes ~30 known auth pitfalls. Faster shipping. |
| `helmet` middleware | Edge headers config (Vercel `vercel.json`, Cloudflare Workers, etc.) | 2022+ | Set once, never forgotten on a new route. |
| Hand-rolled migration runner | Supabase CLI / Drizzle / Prisma migrate | 2021+ | Schema versioning, rollback, environment promotion all handled. |
| `winston` | `pino` | 2018+ but accelerating | 5x+ throughput, native redaction. |
| Zod v3 | Zod v4 | 2025 | Substantial API cleanup; old tutorials misleading. |
| `WHERE tenant_id = ?` predicates | Postgres RLS | 2020+ for multi-tenant SaaS | Defense at DB layer; one missed WHERE = leak. |

**Deprecated/outdated in CURRENT code:**
- `bcryptjs` — drop; Supabase Auth handles password hashing.
- `jsonwebtoken` — drop; Supabase JWT verified via `supabase.auth.getUser()`.
- `sqlite3` — drop; Postgres replaces.
- `cors` package — drop; same-origin for Vercel functions.
- `express` — drop; Vercel functions are bare handlers.

## Assumptions Log

All material claims in this research are either VERIFIED via direct tool calls (npm registry checks, slopcheck, git history checks against the local repo) or CITED from established documentation (Supabase docs, pino docs, envalid README, Upstash ratelimit docs). The handful of assumptions below need user/planner confirmation:

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Auth native login throttling is ~30 req/5min per IP and obviates Upstash on `/api/auth/*` | SEC-05 / Pitfall 5 | If wrong, login brute-force protection is weaker than expected. **Planner must verify** in Supabase dashboard → Auth → Rate Limits. |
| A2 | Vercel function default body size (4.5MB hobby, 50MB pro) is sufficient for the AI proxy and CRUD routes | Concerns map | If wrong, large LLM payloads (e.g., base64 image inputs) get rejected — Phase 3 concern more than Phase 1. |
| A3 | Vite + `api/` directory works on Vercel without Next.js | Architecture | Verified by Vercel docs as supported; **recommend planner verifies with a hello-world function deploy as the first concrete task**. |
| A4 | `@supabase/supabase-js` 2.106.1 is current stable on 2026-05-21 | Stack | Verified via `npm view`. Slop risk near zero (Supabase official package). |
| A5 | Zod v4 is appropriate vs staying on v3 | Stack | If user prefers stability, pin zod 3.x — but the v4 install verified clean. Migration cost is real (Pitfall 1). |
| A6 | "One family per user" enforcement at the policy level (D-08) means making `family_members` `unique(user_id)` for v1 — and lifting it for v2 multi-family | DATA-02 | Could instead just rely on policy logic without unique constraint. **Planner picks.** Recommend the unique constraint for v1 — easier to drop later than to add. |
| A7 | The single RLS denial test is the right test depth for Phase 1 | Validation | If planner believes more tests are cheap, add auth flow + happy-path CRUD. CONTEXT.md "Test scaffolding" deferred to planner. |

## Open Questions

1. **Cookie auth vs localStorage for Supabase session**
   - What we know: Supabase Auth defaults to localStorage. `@supabase/ssr` enables cookies. Cookies reduce XSS theft risk but complicate Vite-without-Next-Router setup.
   - What's unclear: Whether v1 attack surface justifies the integration cost.
   - Recommendation: Stay localStorage in v1. Document as known tradeoff. Revisit in Phase 2 frontend modularization if cookie support is trivial via `@supabase/ssr` on a Vite SPA.

2. **Should we delete `dist/` and `server/database.db` from disk as part of Phase 1?**
   - What we know: Both are gitignored. Both contain old runtime state.
   - What's unclear: Whether deletion is in-scope for an automated plan task or a manual operator step.
   - Recommendation: Include both as plan tasks (`rm -rf dist/` and `rm server/database.db`) — they're trivial and ensure clean baseline.

3. **OpenRouter key rotation — automate or document?**
   - What we know: Current key was never published. Rotation is hygiene-only.
   - What's unclear: Whether to wire automated rotation or just emit a "rotate this key when Supabase setup complete" checklist item.
   - Recommendation: Manual checklist item. Add a `checkpoint:human-verify` task that prompts the operator to rotate via OpenRouter dashboard and update Vercel env, then confirm with a test call.

4. **Log sink: Vercel runtime logs vs Logtail/Better Stack**
   - What we know: Vercel logs are searchable in the dashboard with a 1-hour retention on hobby, longer on pro.
   - What's unclear: Whether 1-hour retention is enough for incident triage in v1.
   - Recommendation: Defer per CONTEXT.md. Ship Vercel runtime logs in Phase 1; revisit when first incident demands longer retention.

5. **DATA-07..DATA-10 schema timing** (drive_connections, telegram_chats, reminders, llm_audit_log)
   - What we know: Each is owned by a later phase (Phase 3 or 4).
   - What's unclear: Whether to land the empty tables now (cheap) or in their owning phases.
   - Recommendation: **Defer to owning phase.** Adds zero value to ship empty tables; risks freezing wrong column types. Phase 1 owns only what Phase 1 features need: families, family_members, children, documents, emails, tasks.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All Vercel functions, supabase CLI, local dev | ✓ | (node --version on dev machine) | — |
| npm | Package install, dev | ✓ | bundled | pnpm available globally too |
| `supabase` CLI | Local DB, migrations, `supabase start` | ⚠ install required | will install via `npm install --save-dev supabase` | Can also `brew install supabase/tap/supabase` |
| Docker | `supabase start` (runs local Postgres in container) | ⚠ verify | — | Without Docker, dev against remote Supabase project only — slower iteration. **Planner: add "verify Docker is running" as a precondition task.** |
| Vercel CLI | Local function dev (`vercel dev`), deploy | ⚠ install required | `npm install -g vercel` (or use npx) | Can develop functions by running them directly with `node` for sanity checks. |
| Git | Source control | ✓ | — | — |
| Supabase project (cloud) | Auth, hosted Postgres | ✗ — must create | — | Create at supabase.com — free tier sufficient for POC. |
| Vercel project | Hosting | ✗ — must create | — | Create at vercel.com — free tier sufficient. |
| Upstash Redis | Rate limiting | ✗ — must create | — | Free tier 10,000 commands/day — sufficient. |
| OpenRouter account | LLM proxy (existing) | ✓ | — | — |

**Missing dependencies with no fallback:** Supabase project, Vercel project, Upstash Redis project — all must be created during Phase 1. Each is a manual signup task.

**Missing dependencies with fallback:** Docker (only blocks local Supabase; can dev against cloud). Vercel CLI (only blocks local function testing; can deploy and test in preview).

## Security Domain

`security_enforcement` is not explicitly false in config — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (managed). Configure password min length 12 + complexity; enable email verification. |
| V3 Session Management | yes | Supabase JWT (15-min access + refresh). Default localStorage storage in v1; documented tradeoff. |
| V4 Access Control | yes | Postgres RLS policies, enforced at DB layer. Repository wrappers do NOT add authorization — DB does. |
| V5 Input Validation | yes | `zod` at every function entry. Schema rejection returns 400, never reaches DB. |
| V6 Cryptography | yes | Supabase hashes passwords (argon2 default in current Supabase Auth). NEVER hand-roll. JWT signing by Supabase. |
| V7 Error Handling & Logging | yes | `pino` with redaction. Generic 500 to client; full stack to logs. Request IDs for correlation. |
| V8 Data Protection | yes | Drop body limit to Vercel default (~4.5MB). No PII in URL params. |
| V9 Communication | yes | HTTPS enforced by Vercel + Supabase. HSTS via `vercel.json`. |
| V10 Malicious Code | yes | slopcheck pass on every new dep. Dependabot enabled. |
| V11 Business Logic | partial | Per-family rate limits on `/api/ai/*` (cost guard). Service-role key never in user routes. |
| V12 Files & Resources | n/a (Phase 1) | Phase 3 owns Drive file ingestion. |
| V13 API & Web Service | yes | All `/api/*` routes auth-required (except `/api/health`). Same-origin. |
| V14 Configuration | yes | `envalid` fail-fast. `vercel.json` security headers. |

### Known Threat Patterns for Vercel + Supabase + JS Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service-role key leak to browser | Information disclosure | Lint rule + CI grep gate on `VITE_*SERVICE*`. Code review checklist. |
| RLS policy bypass via service-role in user route | Elevation of privilege | Architectural rule: service client ONLY in `api/cron/*` and `api/webhooks/*`. Code review checklist. |
| OpenRouter key in browser bundle | Information disclosure | Move server-side (SEC-03). Verify `dist/` with grep gate. |
| Brute-force login | Spoofing | Supabase Auth native throttle + Upstash as defense-in-depth if planner sees gap. |
| LLM cost-runaway attack (DoS by budget) | DoS | Per-family rate limit on `/api/ai/*`; daily cost cap (Phase 3 — stub in Phase 1). |
| XSS → token theft from localStorage | Tampering | React's default escaping. No `dangerouslySetInnerHTML` without sanitization. CSP header. |
| CSRF on `/api/*` | Tampering | JWT in Authorization header (not cookies) → CSRF inapplicable. If cookie auth adopted, add CSRF token. |
| Mass-assignment via supabase-js | Tampering | Validate with zod BEFORE `sb.from().insert()`. Whitelist allowed columns. |
| Cross-tenant data leak via missed WHERE | Information disclosure | RLS makes this impossible. Verified by single RLS denial test. |
| SQL injection | Tampering | supabase-js parameterizes everything. Raw SQL only in migrations (developer-controlled) and `supabase.rpc()` (must validate args). |

## Sources

### Primary (HIGH confidence)
- Supabase official docs (RLS, Auth, CLI, supabase-js) — https://supabase.com/docs — referenced for tenancy patterns, migration workflow, auth API.
- Pino docs (redaction) — https://getpino.io/#/docs/redaction — referenced for PII redaction paths.
- envalid README — https://github.com/af/envalid — referenced for fail-fast pattern.
- Upstash ratelimit docs — https://github.com/upstash/ratelimit-js — referenced for serverless rate-limit pattern.
- Vercel docs (functions, `api/` directory, `vercel.json` headers) — https://vercel.com/docs — referenced for headers + serverless function shape.
- `npm view <pkg> version` for every recommended package — verified 2026-05-21.
- slopcheck v0.10.0 — all 9 packages [OK].
- Local repo verification: `git log -- .env`, `git log -- server/database.db`, `.gitignore` contents.

### Secondary (MEDIUM confidence)
- OWASP ASVS v5 — category applicability mapping.
- Zod v4 migration guide — https://zod.dev/v4 — referenced for breaking-change warnings.

### Tertiary (LOW confidence — flag for validation)
- A1: Supabase Auth native login throttle exact rate (claimed ~30 req/5min) — planner must verify in Supabase dashboard before deciding on auth route Upstash limit.
- A2: Vercel body size limits exact figures — verify against current Vercel pricing docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified via npm registry; every package passed slopcheck; all are well-known.
- Architecture: HIGH — directly derives from CONTEXT.md locked decisions D-01..D-16.
- Patterns: HIGH for envalid, zod, pino, RLS template; MEDIUM for Vercel-specific quirks (cold-start env errors, body size).
- Pitfalls: HIGH for zod v4 breaking changes and RLS performance; MEDIUM for Supabase Auth native rate-limit obviation (needs verification A1).
- Concerns resolution map: HIGH — every CONCERNS.md item explicitly addressed or marked deferred.

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (Supabase / Vercel both move fast; revisit if delayed beyond a month)
