# Requirements: Family AI Assistant

**Defined:** 2026-05-20
**Core Value:** When a document is dropped in the family folder or a school email is forwarded, the system reliably classifies it, files it correctly, extracts actions and dates, and reminds the right family member at the right time via Telegram.

## v1 Requirements

### Security & Foundation

- [ ] **SEC-01**: All sensitive runtime config (`OPENROUTER_API_KEY`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN`) loaded from env at boot via `envalid`; missing keys fail startup
- [ ] **SEC-02**: `.env*` (except `.env.example`) and `server/database.db` are gitignored; any previously committed secrets rotated
- [ ] **SEC-03**: OpenRouter API key is NEVER exposed to the client — all LLM calls go through server-side `/api/ai/*` proxy
- [ ] **SEC-04**: `helmet` security headers + tightened CORS allowlist applied on all responses
- [ ] **SEC-05**: `express-rate-limit` applied to `/api/auth/*` and `/api/ai/*` endpoints
- [ ] **SEC-06**: All API request bodies validated with `zod` schemas before reaching handlers
- [ ] **SEC-07**: Structured logging via `pino` + `pino-http` with PII/secret redaction
- [ ] **SEC-08**: Hassan family seed data removed from production paths; only loaded behind a `DEV` flag
- [ ] **SEC-09**: JWT secret fallback removed; boot fails if `JWT_SECRET` not set

### Data Model & Backend Skeleton

- [ ] **DATA-01**: `families` table introduced as primary tenancy unit; existing `users` records linked to one family
- [ ] **DATA-02**: `family_members` table (replaces ad-hoc family-member columns) with role + profile per person
- [ ] **DATA-03**: `children` table (subset of family_members marked as kids) with aliases array for school-comms disambiguation
- [ ] **DATA-04**: `family_id NOT NULL` FK added to every domain table (`documents`, `emails`, `tasks`, plus new tables)
- [ ] **DATA-05**: Repository pattern in `server/db/repos/` — every query takes `familyId`; no raw SQL outside repos
- [ ] **DATA-06**: Migrations folder (`server/migrations/`) with idempotent SQL files run at boot
- [ ] **DATA-07**: `drive_connections` table stores per-family OAuth tokens, watched folder ID, `start_page_token`, last_sync_at
- [ ] **DATA-08**: `telegram_chats` table binds `chat_id` to `family_id` + optional `member_id`
- [ ] **DATA-09**: `reminders` table with unique `(member_id, doc_or_task_id, kind, scheduled_date)` and `sent_at` for claim-then-send
- [ ] **DATA-10**: `llm_audit_log` table records every router call (family_id, source, model, tokens, cost, decision)
- [ ] **DATA-11**: `server.js` decomposed into `adapters/rest.js`, `routes/`, `middleware/`, `db/`, `services/`

### Frontend Modularization

- [ ] **FE-01**: `src/App.jsx` reduced to a <200-line shell that routes between feature modules
- [ ] **FE-02**: Feature folders under `src/features/{auth,docs,school,settings}` — no cross-feature imports
- [ ] **FE-03**: Mock/fixture data moved to `src/fixtures/` and only imported under `import.meta.env.DEV` gate
- [ ] **FE-04**: `react-router-dom` replaces `activeTab` string-state navigation; deep links work
- [ ] **FE-05**: `@tanstack/react-query` replaces optimistic-fire-and-forget fetches; loading + error states surface in UI

### LLM Router (Cross-cutting)

- [ ] **LLM-01**: Single `routeEvent({source, payload, familyContext})` function dispatches all LLM-driven actions
- [ ] **LLM-02**: All prompts stored as `.md` files in `server/prompts/` with versioned filenames
- [ ] **LLM-03**: All LLM calls use OpenRouter `response_format: json_object` with `zod`-validated output schemas
- [ ] **LLM-04**: Untrusted content (document text, Telegram messages) wrapped in delimited blocks before prompt assembly
- [ ] **LLM-05**: Router output `family_id` MUST match source `family_id` — mismatch raises error, does not write
- [ ] **LLM-06**: Per-family daily cost cap (configurable) — calls beyond cap return error + alert at 80%
- [ ] **LLM-07**: Action whitelist enum — router cannot invoke any action outside the registered set
- [ ] **LLM-08**: Wrong model slug `google/gemini-3.5-flash` replaced with verified default + documented fallback chain
- [ ] **LLM-09**: Every router invocation written to `llm_audit_log`

### Module 1 — Document Vault

- [ ] **DOCS-01**: User connects family Google Drive folder via OAuth (drive.file scope, folder picker)
- [ ] **DOCS-02**: Backend polls `changes.list` every 60s with persisted `startPageToken` per family
- [ ] **DOCS-03**: Cold-start reconciliation via `files.list(modifiedTime ≥ last_sync)` if page token lost
- [ ] **DOCS-04**: New/changed file in watched folder triggers classification: category, expiry_date, expiry_date_source_text, assigned_member, confidence
- [ ] **DOCS-05**: `expiry_date_source_text` MUST appear as substring in extracted document text — else flag for manual review
- [ ] **DOCS-06**: Classifications below confidence threshold (configurable, default 0.7) flagged for manual review
- [ ] **DOCS-07**: User can browse documents by category, family member, expiry window
- [ ] **DOCS-08**: User can preview document inline + open original in Drive (linkback)
- [ ] **DOCS-09**: User can manually override category, expiry, assigned member; override persists and audit-logs the AI's original suggestion
- [ ] **DOCS-10**: Reminders auto-scheduled at 60/30/7/1 days before expiry, configurable per category
- [ ] **DOCS-11**: User can mark a document as renewed → next-expiry recomputed or document re-extracted

### Module 2 — School Hub

- [ ] **SCH-01**: User can create/edit/delete child profiles with name + aliases + grade
- [ ] **SCH-02**: User can manually paste school-comm text or upload PDF/image via UI or Telegram
- [ ] **SCH-03**: LLM extracts: task description, due_date, child_id (from enum of family children + aliases), priority
- [ ] **SCH-04**: Tasks with ambiguous child assignment flagged for user confirmation
- [ ] **SCH-05**: Per-child dashboard surfaces open tasks ordered by due date
- [ ] **SCH-06**: Tasks reuse reminder pipeline (DOCS-10) — configurable lead times per task type
- [ ] **SCH-07**: User can mark tasks complete/dismissed; both states preserved with timestamp
- [ ] **SCH-08**: Each task links back to its source communication

### Telegram & Reminders

- [ ] **TG-01**: Single Telegram bot configured via `TELEGRAM_BOT_TOKEN`; webhook setup at boot with secret token header
- [ ] **TG-02**: User pairs Telegram via `/link <one-time-code>` flow; binds chat_id → family_id (+ optional member_id)
- [ ] **TG-03**: Bot accepts text + file attachments routed through `routeEvent` with `source=telegram`
- [ ] **TG-04**: All outbound reminders sent via single `telegramSender` service with idempotency on `(reminder_id)`
- [ ] **TG-05**: Reminder scheduler runs in-process via `croner` every minute
- [ ] **TG-06**: Scheduler queries `scheduled_at <= now() AND sent_at IS NULL` (not tick-window) — catches up after downtime
- [ ] **TG-07**: Claim-then-send: `UPDATE reminders SET sent_at = now() WHERE id = ? AND sent_at IS NULL` must affect 1 row before Telegram call
- [ ] **TG-08**: Reminders honor per-family quiet hours (configurable, default 22:00–08:00 family timezone)
- [ ] **TG-09**: Reminders use timezone-aware scheduling (luxon or date-fns-tz); DST transitions don't shift schedule
- [ ] **TG-10**: User can reply to a reminder with `done` / `snooze 1d` / `cancel` — handled by router
- [ ] **TG-11**: Daily digest (default) groups same-day reminders into one message to prevent fatigue

### Onboarding & Production

- [ ] **OPS-01**: First-run flow guides new user: create family → add members + children → connect Drive → pair Telegram
- [ ] **OPS-02**: Litestream configured to back up SQLite to S3-compatible storage (R2 or Tigris); restore drill documented
- [ ] **OPS-03**: Fly.io app deployed with `count=1`, persistent volume, WAL-mode SQLite, healthcheck endpoint
- [ ] **OPS-04**: Vercel frontend deployed; configured CORS allowlist matches deployed origin

## v2 Requirements

### Email Connectors

- **EMAIL-01**: User can connect Gmail via OAuth read-only for school-comm ingestion
- **EMAIL-02**: User can configure forwarding email address (`<token>@inbound.familyai.app`) per family
- **EMAIL-03**: IMAP option for non-Gmail providers

### AI Personalization

- **AI-01**: User can edit per-family LLM prompts (skill-like, visible in UI)
- **AI-02**: User can pin preferred model per task type
- **AI-03**: Per-family knowledge file injected into router context

### Expanded Scope

- **CAL-01**: Calendar view of all family expiries + tasks
- **CAL-02**: Two-way Google Calendar sync
- **GRADE-01**: Academic grades tracking per child
- **WA-01**: WhatsApp Cloud API bot (parallel to Telegram)
- **DROPBOX-01**: Dropbox as cloud drive option
- **ICLOUD-01**: iCloud as cloud drive option

### Multi-tenant SaaS

- **MT-01**: Multi-family user accounts (user can join multiple families)
- **MT-02**: Per-family billing + subscription (Stripe)
- **MT-03**: Postgres migration from SQLite
- **MT-04**: Per-family LLM cost dashboard with hard cutoff
- **MT-05**: Admin console

### Trust & Power Features

- **TRUST-01**: Confidence score visible per AI decision
- **TRUST-02**: Daily "what the AI did" digest in app
- **TRUST-03**: Undo last AI action button
- **TRUST-04**: Conversational queries in Telegram ("what's expiring this month?")
- **TRUST-05**: Recurring-task auto-detection from school comms

## Out of Scope

| Feature | Reason |
|---------|--------|
| Local-daemon directory watcher | Users won't run daemons; cloud drive is the model |
| Email connectors in v1 | Privacy concern; Drive folder covers POC |
| User-editable AI instructions in v1 | Power-user feature; deferred to v2 |
| Calendar + academic grades in v1 | Comms parsing first; CAL/GRADE deferred |
| WhatsApp bot | Telegram chosen for POC ease |
| iCloud / Dropbox | Google Drive only for POC |
| Multi-tenant infrastructure | Single-family POC first |
| Mobile native apps | Web-first; mobile later |
| Standalone test phase | Tests added inside feature phases, not as a phase |
| Auto-replying to school staff | Out of scope — risk of incorrect AI replies on the family's behalf |
| Direct teacher messaging | ParentSquare's lane; we surface, we don't message schools |
| Two-way calendar sync in v1 | Read-only or no calendar in v1; sync is v2 |
| Native PDF storage on our servers | Drive is source of truth; we keep metadata only |
| LangChain / Vercel AI SDK | Abstractions for problems we don't have |
| Postgres migration in v1 | SQLite + Litestream sufficient for one family |
| TypeScript migration in v1 | Stack stability over migration cost in POC |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| SEC-06 | Phase 1 | Pending |
| SEC-07 | Phase 1 | Pending |
| SEC-08 | Phase 1 | Pending |
| SEC-09 | Phase 1 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| DATA-06 | Phase 1 | Pending |
| DATA-07 | Phase 1 | Pending |
| DATA-08 | Phase 1 | Pending |
| DATA-09 | Phase 1 | Pending |
| DATA-10 | Phase 1 | Pending |
| DATA-11 | Phase 1 | Pending |
| FE-01 | Phase 2 | Pending |
| FE-02 | Phase 2 | Pending |
| FE-03 | Phase 2 | Pending |
| FE-04 | Phase 2 | Pending |
| FE-05 | Phase 2 | Pending |
| LLM-01 | Phase 3 | Pending |
| LLM-02 | Phase 3 | Pending |
| LLM-03 | Phase 3 | Pending |
| LLM-04 | Phase 3 | Pending |
| LLM-05 | Phase 3 | Pending |
| LLM-06 | Phase 3 | Pending |
| LLM-07 | Phase 3 | Pending |
| LLM-08 | Phase 3 | Pending |
| LLM-09 | Phase 3 | Pending |
| DOCS-01 | Phase 3 | Pending |
| DOCS-02 | Phase 3 | Pending |
| DOCS-03 | Phase 3 | Pending |
| DOCS-04 | Phase 3 | Pending |
| DOCS-05 | Phase 3 | Pending |
| DOCS-06 | Phase 3 | Pending |
| DOCS-07 | Phase 3 | Pending |
| DOCS-08 | Phase 3 | Pending |
| DOCS-09 | Phase 3 | Pending |
| DOCS-10 | Phase 3 | Pending |
| DOCS-11 | Phase 3 | Pending |
| SCH-01 | Phase 4 | Pending |
| SCH-02 | Phase 4 | Pending |
| SCH-03 | Phase 4 | Pending |
| SCH-04 | Phase 4 | Pending |
| SCH-05 | Phase 4 | Pending |
| SCH-06 | Phase 4 | Pending |
| SCH-07 | Phase 4 | Pending |
| SCH-08 | Phase 4 | Pending |
| TG-01 | Phase 4 | Pending |
| TG-02 | Phase 4 | Pending |
| TG-03 | Phase 4 | Pending |
| TG-04 | Phase 4 | Pending |
| TG-05 | Phase 4 | Pending |
| TG-06 | Phase 4 | Pending |
| TG-07 | Phase 4 | Pending |
| TG-08 | Phase 4 | Pending |
| TG-09 | Phase 4 | Pending |
| TG-10 | Phase 4 | Pending |
| TG-11 | Phase 4 | Pending |
| OPS-01 | Phase 4 | Pending |
| OPS-02 | Phase 4 | Pending |
| OPS-03 | Phase 4 | Pending |
| OPS-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 68 total
- Mapped to phases: 68 (100%)
- Unmapped: 0 ✓

**Per-phase counts:**
- Phase 1 (Security & Backend Foundation): 20 requirements (SEC-01..09, DATA-01..11)
- Phase 2 (Frontend Modularization): 5 requirements (FE-01..05)
- Phase 3 (LLM Router + Drive + Document Vault): 20 requirements (LLM-01..09, DOCS-01..11)
- Phase 4 (Telegram, Reminders, School Hub & Production): 23 requirements (SCH-01..08, TG-01..11, OPS-01..04)

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 — traceability populated by roadmapper*
