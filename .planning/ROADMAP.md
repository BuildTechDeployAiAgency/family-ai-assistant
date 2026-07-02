# Roadmap: Family AI Assistant

**Created:** 2026-05-20
**Granularity:** coarse (3-5 phases)
**Project structure mode:** standard (Horizontal Layers)
**Coverage:** 68/68 v1 requirements mapped

## Core Value

When a document is dropped in the family folder or a school email is forwarded, the system reliably classifies it, files it correctly, extracts actions and dates, and reminds the right family member at the right time via Telegram.

## Phases

- [ ] **Phase 1: Security & Backend Foundation** — Lock down secrets, harden API, evolve data model to family-scoped repos
- [ ] **Phase 2: Expo Native Client** — Build iOS/Android/Web app with Expo Router + Supabase auth + Document Vault + School Hub screens; distribute via Expo Go for real-family testing (replaces web SPA modularization — decision 2026-06-02)
- [ ] **Phase 3: LLM Router + Drive + Document Vault** — Thesis-validating core: file dropped in Drive → classified, dated, assigned, persisted
- [ ] **Phase 4: Telegram, Reminders, School Hub & Production** — Close the value loop end-to-end and ship to a real family on Vercel + Supabase + Upstash

## Phase Details

### Phase 1: Security & Backend Foundation

**Goal**: A secure, tenant-scoped backend skeleton ready to host all feature work — no client-exposed secrets, no raw SQL outside repos, every domain row keyed by `family_id`.

**Depends on**: Nothing (first phase, must complete before any feature work)

**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, DATA-11

**Success Criteria** (what must be TRUE):
  1. The OpenRouter API key is provably absent from the client bundle — all LLM calls go through `/api/ai/*` proxy with JWT auth
  2. Starting any Vercel function with required env (`OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) missing fails fast via `envalid` with a clear error; no source-level fallbacks remain
  3. `.env*` and `server/database.db` are gitignored, prior leaked secrets have been rotated, and `git log` confirms no secrets in history
  4. Every Phase-1 domain table (`families`, `family_members`, `children`, `documents`, `emails`, `tasks`) has `family_id NOT NULL` and access is mediated by Postgres RLS policies (D-07) plus thin `lib/db/{resource}.js` wrappers (D-09). The downstream Drive / Telegram / reminder / audit-log tables are OWNED BY LATER PHASES per D-05 and RESEARCH Open Q #5 (RESOLVED) — not part of Phase 1 scope.[^ph1-sc4]
  5. Vercel serverless functions under `api/` replace Express; shared code under `lib/{env,supabase,schemas,db,logger,ratelimit}`; helmet replaced by `vercel.json` headers; CORS unnecessary for same-origin browser→`/api/*` (allowlist remains for external webhooks); `zod` validates each function entry; `pino` structured logs with PII redaction; `@upstash/ratelimit` on `/api/ai/*`

[^ph1-sc4]: Ownership reallocation per CONTEXT.md D-05 and RESEARCH.md Open Q #5 (RESOLVED).

**Plans**: 3 plans
- [ ] 01-01-PLAN.md — Reconcile docs to Supabase+Vercel pivot; provision Supabase/Vercel/Upstash; scrub stale runtime state; move Hassan fixtures to DEV-only; rotate OpenRouter key
- [ ] 01-02-PLAN.md — Initial Supabase migration with RLS for families/family_members/children/documents/emails/tasks; lib/env, lib/supabase, lib/today, lib/db/* repo wrappers; single RLS denial integration test
- [ ] 01-03-PLAN.md — Vercel serverless functions under api/ replacing server.js; vercel.json security headers; zod request validation; pino structured logs with PII redaction; @upstash/ratelimit on /api/ai/*; Supabase Auth replaces custom JWT in src/App.jsx; OpenRouter proxied server-side; deploy + smoke test


### Phase 2: Expo Native Client *(PIVOTED 2026-06-02)*

**Goal**: A native iOS + Android app built with Expo that real family members can install via Expo Go (no App Store), covering Document Vault, School Hub, and Actions — backed by the live Vercel `api/` deployed in Phase 1.

**Decision rationale**: Web SPA modularization deferred. Expo enables real-user testing on phones in 2 weeks without App Store. Backend is client-agnostic.

**Depends on**: Phase 1 complete (live Vercel `api/` + Supabase + Upstash)

**Requirements**: FE-01, FE-02, FE-03, DOCS-01, DOCS-02, DOCS-03, DOCS-07, SCH-01, SCH-02, SCH-03, SCH-04

**Success Criteria** (what must be TRUE):
  1. A family member with Expo Go installed on their phone scans a QR code and reaches a working app within 30s
  2. They can log in with Supabase Auth, session persists across app restarts (SecureStore)
  3. They can scan a document photo → AI extracts title/category/expiry → they confirm → document appears in list
  4. They can view school tasks per child and mark them complete
  5. All screens have loading + error states; no blank/crash on network failure
  6. QA pass complete: 0 open bugs in `02-04-BUG-LOG.md`

**Plans**: 4 plans
- [ ] 02-01-PLAN.md — Expo project init in `mobile/`; Supabase auth with SecureStore; root layout + auth gate; 3-tab shell (Documents / School / Actions)
- [ ] 02-02-PLAN.md — Document Vault screens: list, detail, scan/upload with AI extraction flow
- [ ] 02-03-PLAN.md — School Hub (per-child task lists) + Actions screen (all pending with filters)
- [ ] 02-04-PLAN.md — QA pass: device testing regression matrix, bug fix round, Expo Go distribution prep

**Model delegation**:
- GLM: UI component scaffolding, screen layouts
- Kimi: API clients, auth flows, data hooks
- Orchestrator (Claude Sonnet): plan verification, bug triage, architectural decisions

**UI hint**: yes

### Phase 3: LLM Router + Drive + Document Vault

**Goal**: A user can connect their family Google Drive folder, drop any document into it, and within ~60s see it classified, dated, assigned to the right family member, and persisted — with every LLM decision audited, scoped, and budget-bounded.

**Depends on**: Phase 1 (data model, AI proxy), Phase 2 (UI surfaces for browse/override)

**Requirements**: LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, LLM-06, LLM-07, LLM-08, LLM-09, DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08, DOCS-09, DOCS-10, DOCS-11

**Success Criteria** (what must be TRUE):
  1. User can complete Google Drive OAuth from the UI, pick a watched folder, and see the connection persisted; backend polls `changes.list` every 60s using a saved `startPageToken` per family and cold-starts via `files.list(modifiedTime ≥ last_sync)` if the token is lost
  2. A new file in the watched folder is auto-classified within ~60s into category + `expiry_date` + assigned member + confidence, with `expiry_date_source_text` verified as a substring of extracted text — sub-threshold or unverifiable results are flagged for manual review, not auto-applied
  3. User can browse documents by category, family member, and expiry window; preview inline; open the original in Drive; and manually override category/expiry/assigned member with the AI's original suggestion preserved in an audit log
  4. Marking a document "renewed" recomputes next-expiry or re-extracts; reminders are auto-scheduled at 60/30/7/1 days before expiry (configurable per category) and persisted to the `reminders` table
  5. Every LLM call goes through a single `routeEvent({source, payload, familyContext})` function using versioned `.md` prompts, `response_format: json_object` with `zod`-validated schemas, an action whitelist, untrusted-content delimiters, output `family_id` cross-check, per-family daily cost cap with 80% alert, and an `llm_audit_log` row — the wrong `google/gemini-3.5-flash` slug is replaced with a verified default + documented fallback chain

**Plans**: TBD

**UI hint**: yes

### Phase 4: Telegram, Reminders, School Hub & Production

**Goal**: The full value loop is live for a real family — reminders land in Telegram at the right local time without duplicates or misses, school comms flow into per-child tasks, and the app is deployed on Fly + Vercel with first-run onboarding and backup/restore proven.

**Depends on**: Phase 3 (router + data + reminders table)

**Requirements**: TG-01, TG-02, TG-03, TG-04, TG-05, TG-06, TG-07, TG-08, TG-09, TG-10, TG-11, SCH-01, SCH-02, SCH-03, SCH-04, SCH-05, SCH-06, SCH-07, SCH-08, OPS-01, OPS-02, OPS-03, OPS-04

**Success Criteria** (what must be TRUE):
  1. A new family can pair Telegram via `/link <one-time-code>` (binding `chat_id` → `family_id`); the bot accepts text + file attachments through `routeEvent` with `source=telegram` and replies to reminders with `done` / `snooze 1d` / `cancel` are honored
  2. The `croner` scheduler running every minute fires reminders via `telegramSender` using claim-then-send (`UPDATE reminders SET sent_at WHERE sent_at IS NULL` affecting 1 row before the API call), queries `scheduled_at <= now() AND sent_at IS NULL` (not tick-window) so downtime catches up, respects per-family quiet hours (default 22:00–08:00) and timezone with no DST drift, and groups same-day items into one daily digest by default
  3. User can create/edit/delete child profiles with name + aliases + grade; pasting or uploading a school communication (UI or Telegram) extracts task + due_date + child_id (from family-children enum) + priority, with ambiguous-child cases flagged for confirmation
  4. The per-child dashboard surfaces open tasks ordered by due date; tasks reuse the reminder pipeline, can be marked complete/dismissed (both timestamped), and each task links back to its source communication
  5. A new user can complete first-run onboarding end-to-end (create family → add members + children → connect Drive → pair Telegram) on a Vercel project deployed (frontend + `api/` functions), Supabase project healthy, Upstash Redis configured, `.env.example` matches deployed env, manual restore drill from Supabase point-in-time recovery documented

**Plans**: TBD

**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security & Backend Foundation | 0/? | Not started | - |
| 2. Frontend Modularization | 0/? | Not started | - |
| 3. LLM Router + Drive + Document Vault | 0/? | Not started | - |
| 4. Telegram, Reminders, School Hub & Production | 0/? | Not started | - |

## Dependencies Graph

```
Phase 1 (Security + Backend Foundation)
   ├── Phase 2 (Frontend Modularization)
   └── Phase 3 (LLM Router + Drive + Vault)  ← depends on Phase 1 + 2
           └── Phase 4 (Telegram + Reminders + School + Prod)
```

---
*Roadmap created: 2026-05-20*
