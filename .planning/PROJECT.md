# Family AI Assistant

## What This Is

An AI-powered family operations assistant that watches a shared cloud drive folder and Telegram chat, organizes household documents, tracks expiries and renewals, and surfaces school-related tasks per child. Built for a single family POC first, with the goal of becoming a multi-tenant SaaS product later.

## Core Value

When a document is dropped in the family folder or a school email is forwarded, the system reliably classifies it, files it correctly, extracts actions and dates, and reminds the right family member at the right time via Telegram.

## Requirements

### Validated

<!-- Inferred from existing codebase. These already work in the current implementation. -->

- ✓ JWT-based email/password authentication (`server/server.js`) — existing
- ✓ SQLite persistence for users, documents, emails, tasks, family members — existing
- ✓ Document CRUD with category + expiry date — existing
- ✓ Email CRUD with read/important flags — existing
- ✓ Task CRUD with priority + due date + completion state — existing
- ✓ OpenRouter LLM integration for email analysis — existing (currently client-side, must move server-side in Phase 1)
- ✓ React SPA with lockscreen + tabbed dashboard — existing
- ✓ Hassan family seed data on empty profile load — existing (to be replaced by real onboarding)

### Active

<!-- v1 scope. Hypotheses until shipped. -->

**Phase 1 — Security & Foundation**
- [ ] Move OpenRouter API key to server-side proxy (currently exposed in client bundle)
- [ ] Gitignore `.env` and `server/database.db`; rotate any leaked secrets
- [ ] Replace default JWT secret with boot-time env validation
- [ ] Add rate limiting on auth endpoints
- [ ] Add input validation on all API endpoints
- [ ] Tighten CORS to known origins
- [ ] Add basic security headers (helmet)

**Module 1 — Document Vault**
- [ ] Connect family Google Drive folder (OAuth) as primary file source
- [ ] Watch folder for new/changed files (polling or push)
- [ ] Auto-classify dropped files into categories via LLM
- [ ] Extract expiry/renewal dates from documents (OCR + LLM)
- [ ] Per-family + per-individual subfolders with sharing
- [ ] Reminder pipeline for upcoming expiries (Telegram)
- [ ] Generate renewal action items as tasks

**Module 2 — School Hub**
- [ ] Per-child profiles within a family
- [ ] Ingest school communications (manual paste or forwarded files in v1; email connector in v2)
- [ ] LLM extracts tasks, dates, and the relevant child
- [ ] Surface child-tagged tasks in dashboard and via Telegram

**Cross-cutting**
- [ ] Single LLM router service: file events + chat messages → action dispatch
- [ ] Telegram bot: receive messages, push reminders, confirm actions
- [ ] Refactor monolithic 3,643-line `src/App.jsx` into feature modules
- [ ] Remove hardcoded Hassan mock data from production code

### Out of Scope

- **Email connectors (Gmail/IMAP) in v1** — privacy concern, user wants drive folder as primary input; deferred to v2
- **User-editable AI instructions (skill-like)** — power-user feature, deferred to v2
- **Calendar + academic grades** — start with comms parsing only; deferred to v2
- **WhatsApp bot** — Telegram chosen for POC ease; WhatsApp Cloud API harder
- **iCloud / Dropbox integration** — Google Drive only for POC; others later
- **Multi-tenant infrastructure** — single-family POC first, SaaS hardening later
- **Mobile native apps** — web-first, mobile is later
- **Automated test suite as a phase goal** — tests should be added inside each feature phase rather than as a standalone phase (current codebase has zero tests)
- **Local-daemon directory watcher** — rejected; users won't run daemons, cloud drive only

## Context

**Codebase state** (see `.planning/codebase/` for full map):
- Vite 8 + React 19 monolithic SPA — single 3,643-line `src/App.jsx` contains all UI
- Express 5 backend with flat routing, SQLite via `sqlite3` promise wrappers
- JWT auth (30-day tokens) stored in localStorage (XSS-vulnerable)
- OpenRouter API key currently embedded in client bundle (must fix Phase 1)
- `.env` not gitignored, `server/database.db` potentially committed
- Hassan family mock data baked into seeding logic
- Zero automated tests, no CI

**Domain context:**
- Target users: families managing household admin (passports, IDs, insurance, utility bills, school comms)
- Pain points: scattered docs, missed renewal deadlines, school emails buried in inboxes, no per-child visibility
- Privacy is a primary user concern — drive folder model is more comfortable than email OAuth

**End-state vision:**
- Multi-tenant SaaS, per-family Google Workspace or Drive connection
- AI agent per family with custom instructions (skill-like) — v2

## Constraints

- **Tech stack**: Vite + React 19, Express 5, SQLite — keep current stack for POC; pivot to Postgres only when multi-tenant
- **Hosting**: Vercel (frontend) + Fly.io (backend + SQLite volume)
- **AI provider**: OpenRouter (already wired); model choice flexible
- **Chat platform**: Telegram only for v1
- **Cloud drive**: Google Drive only for v1
- **Auth**: email/password (no OAuth providers in v1)
- **Scope**: single-family POC — no multi-tenant isolation work in v1, but data model should not block it later
- **Security**: Phase 1 must fix all critical concerns from `.planning/codebase/CONCERNS.md` before any feature work

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep current stack (Vite+React+Express+SQLite+OpenRouter) | Avoid rewrite cost on POC; existing scaffolding usable | — Pending |
| Single-family POC before multi-tenant SaaS | Validate value with one family before infra investment | — Pending |
| Google Drive as primary input, Telegram as secondary | Privacy-friendly vs email OAuth; both push to same LLM router | — Pending |
| Single LLM router for file + chat events | One pipeline, one prompt surface, easier to reason about | — Pending |
| Phase 1 = security hardening before features | Cannot ship with client-side API key + leaked secrets risk | — Pending |
| Telegram only (defer WhatsApp) | Bot API trivial vs WhatsApp Cloud API overhead | — Pending |
| Email connector deferred to v2 | User privacy concern + drive folder covers POC needs | — Pending |
| GSD framework used for planning only, not as runtime dep | Clarified during questioning | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-20 after initialization*
