---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to discuss / plan
last_updated: "2026-05-21T01:42:51.967Z"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: Family AI Assistant

**Last Updated:** 2026-05-20

## Project Reference

**Core Value:** When a document is dropped in the family folder or a school email is forwarded, the system reliably classifies it, files it correctly, extracts actions and dates, and reminds the right family member at the right time via Telegram.

**Current Focus:** Phase 1 — Security & Backend Foundation. Cannot ship any feature work until OpenRouter key is server-side, secrets are gitignored/rotated, JWT secret env-validated, and every domain table is `family_id`-scoped through repositories.

## Current Position

- **Milestone:** v1 POC (single family)
- **Phase:** 1 — Security & Backend Foundation
- **Plan:** (none yet — awaiting `/gsd:plan-phase 1`)
- **Status:** Ready to discuss / plan
- **Progress:** [░░░░░░░░░░] 0/4 phases complete

## Roadmap Snapshot

| Phase | Name | Status |
|-------|------|--------|
| 1 | Security & Backend Foundation | Ready to discuss |
| 2 | Frontend Modularization | Not started |
| 3 | LLM Router + Drive + Document Vault | Not started |
| 4 | Telegram, Reminders, School Hub & Production | Not started |

## Performance Metrics

- v1 requirements: 68 total, 68 mapped to phases (100% coverage)
- Phases complete: 0/4
- Plans complete: 0
- Verification passes: 0

## Accumulated Context

### Decisions Locked

| Decision | Rationale |
|----------|-----------|
| Keep current stack (Vite+React+Express+SQLite+OpenRouter) | Avoid rewrite cost on POC; existing scaffolding usable |
| Single-family POC before multi-tenant SaaS | Validate value with one family before infra investment |
| Google Drive as primary input, Telegram as secondary | Privacy-friendly vs email OAuth; both push to same LLM router |
| Single LLM router for file + chat events | One pipeline, one prompt surface, easier to reason about |
| Phase 1 = security hardening before any feature work | Cannot ship with client-side API key + leaked secrets |
| Telegram only (defer WhatsApp), Drive only (defer iCloud/Dropbox) | POC simplicity |
| Email connector deferred to v2 | User privacy concern; Drive folder covers POC |
| Stay JavaScript ESM (no TypeScript migration in v1) | Stack stability over migration cost |
| Stay SQLite + Litestream (no Postgres in v1) | Sufficient for one family |

### Open TODOs (carried into planning)

- Confirm Drive OAuth scope: `drive.file` vs `drive.readonly` on connected folder (Phase 3 question)
- Pick default LLM model slug + fallback chain composition (Phase 3 question)
- Set per-family daily LLM cost cap ($/day) (Phase 3 question)
- Telegram pairing UX: group chat vs DM vs per-member (Phase 4 question)
- `better-sqlite3` migration timing — coupled to route decomposition refactor

### Known Blockers

None at roadmap stage. Phase 1 is the first to execute.

## Session Continuity

**Last session:** 2026-05-21T01:42:51.957Z

**Next session:** Run `/gsd:plan-phase 1` to decompose Phase 1 into 1-3 plans (coarse granularity).

**Files of interest:**

- `.planning/ROADMAP.md` — phase structure + success criteria
- `.planning/REQUIREMENTS.md` — 68 v1 requirements with phase mapping
- `.planning/PROJECT.md` — vision + constraints
- `.planning/codebase/CONCERNS.md` — Phase 1 inputs (security gaps to close)
- `.planning/research/STACK.md` — additive libraries (envalid, helmet, zod, pino, googleapis, grammy, croner, etc.)
- `.planning/research/ARCHITECTURE.md` — refactored folder layout target
- `.planning/research/PITFALLS.md` — pitfalls flagged by phase

---
*State initialized: 2026-05-20*
