# Phase 1: Security & Backend Foundation — Discussion Log

**Session date:** 2026-05-21
**Mode:** discuss (default, no flags)

## Q1 — Gray area selection

**Question:** Which gray areas discuss for Phase 1?
**Options presented:**
1. Data migration strategy
2. SQLite driver swap
3. AI proxy endpoint shape
4. Repo layer + test scaffolding

**User selection:** Data migration strategy, SQLite driver swap

## Q2 — Data migration strategy

**Question:** How handle existing SQLite data when introducing family_id-scoped schema?
**Options:**
1. Wipe + rebuild, no migration framework
2. Wipe + rebuild, BUT add migrations framework now (recommended)
3. Real ALTER migrations + backfill default family

**User selection:** Wipe + rebuild, no migration framework

## Q3 — DATA-06 conflict surface

Claude flagged that the user's selection drops DATA-06 (migrations runner) from REQUIREMENTS.md.

**Question:** Keep DATA-06 or drop?
**Options:**
1. Keep DATA-06 — ship minimal runner now (recommended)
2. Drop DATA-06 — update REQUIREMENTS.md

**User selection:** Keep DATA-06 — ship minimal runner now

**Reconciled decision:** Wipe DB + ship migrations runner; treat new schema as `001_initial.sql`.

## Q4 — SQLite driver swap

**Question:** Keep sqlite3 or swap to better-sqlite3 now?
**Options:**
1. Swap to better-sqlite3 now (recommended)
2. Keep sqlite3
3. Defer — wrap in repo layer either way

**User response (Other):** "Actually we will be integrating with Supabase"

**Effect:** Question becomes moot. Triggered a stack-pivot discussion that overrode multiple locked constraints (SQLite, Fly.io, custom JWT, "Postgres migration in v1 — out of scope").

## Q5 — Supabase scope

**Question:** How much pivot — Supabase scope?
**Options:**
1. Full pivot: Postgres + Auth + RLS
2. Postgres only, keep custom Express auth
3. Auth only, keep SQLite
4. Defer to v2

**User selection:** Full pivot — Postgres + Auth + RLS

## Q6 — Backend topology

**Question:** Where does server-side code live with Supabase?
**Options:**
1. Pure Supabase Edge Functions
2. Hybrid: Vercel serverless functions + Supabase DB
3. Hybrid: keep Express on Fly.io + Supabase DB/Auth (recommended)

**User selection:** Vercel serverless functions + Supabase DB

## Final decision set

See `01-CONTEXT.md` §Implementation Decisions — D-01..D-16.

## Deferred ideas / scope creep redirected

- AI proxy endpoint shape (not discussed; deferred to Phase 3 planning).
- Test scaffolding (not discussed; planner decides minimum bootstrap; otherwise feature phases per REQUIREMENTS.md).
- Magic-link auth, multi-family accounts, LLM cost dashboard — explicit v2.

## Claude's discretion items

- File layout under `api/` (Vercel functions).
- Migration filename convention (Supabase CLI defaults).
- `@supabase/ssr` cookie helpers vs explicit JWT.
- Log sink in production (Vercel runtime logs vs Logtail / Better Stack).
- Vite + `api/` directory vs Next.js migration (strong default: stay on Vite).

## Critical follow-up

REQUIREMENTS.md, ROADMAP.md, and CLAUDE.md contain locked constraints that the Supabase pivot invalidates (SQLite, custom JWT, Fly.io, "Postgres migration in v1 — out of scope"). These docs MUST be updated before `/gsd:plan-phase 1` runs, or the plan will inherit contradictions.
