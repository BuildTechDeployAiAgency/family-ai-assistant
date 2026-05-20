# Research Summary — Family AI Assistant

**Synthesized:** 2026-05-20
**Status:** INPUT to roadmapper — not the final roadmap.

## TL;DR

- **The wedge is "drop-file-in-Drive → 60s later it's classified, dated, assigned, and a reminder is scheduled."** No competitor bridges storage + extraction + per-member assignment + chat reminders. Family organizers (Cozi, FamilyWall) lack docs; vaults (1Password) lack expiry-as-first-class; expiry trackers (DocReminder) force manual entry; school platforms (ParentSquare) require school-side adoption.
- **Architecture is one Express process** on a single Fly machine: three input adapters (REST, Drive, Telegram) converging on one in-process LLM router, two domain modules (docs-vault, school-hub), one in-process scheduler (`croner`), SQLite + Litestream backup. No microservices, no Redis, no LiteFS.
- **Phase 1 is non-negotiable security hardening** — OpenRouter key in client bundle, `.env` and `database.db` not gitignored, JWT default secret in source. Nothing else ships until fixed.
- **Top risks are LLM-shaped, not infra-shaped**: prompt injection from docs, hallucinated expiry dates, reminder duplication/missing after restarts, Drive page-token loss, and `family_id` scoping leaks that become catastrophic at v2.
- **Stack is locked**: Vite+React+Express+SQLite+OpenRouter stay. Additive: `googleapis`, `grammy`, `croner`, `helmet`, `express-rate-limit`, `zod`, `envalid`, `pino`, `pdfjs-dist`, `sharp`, Litestream. Rejected: Tesseract, LangChain, BullMQ+Redis, LiteFS, node-cron, Postgres-now, TS-now.

## Recommended Stack (Condensed)

| Concern | Pick | Why |
|---|---|---|
| Drive | `googleapis` ^144 + polling `changes.list` with persisted `startPageToken` | Push needs HTTPS + channel renewal cron = 3 failure modes vs 1. Defer push to v2. |
| Telegram | **grammY** ^1.43 (long polling POC, webhook v2) | Modern, plugin ecosystem; Telegraf docs regressed; `node-telegram-bot-api` is toy-bot territory. |
| OCR | **Multimodal LLM (OpenRouter)** + `pdfjs-dist` fast-path + `sharp` downscale | One round-trip = text + structured fields. Tesseract = Docker pain + still needs LLM. |
| Scheduler | **`croner`** ^9 in-process | Single machine = in-process correct. Handles DST/leap-year. BullMQ+Redis overkill. |
| LLM proxy | Bespoke `/api/ai/*` + `fetch` to OpenRouter, prompts as `.md` files in `server/prompts/` | LangChain/Vercel AI SDK are abstractions for problems we don't have. JSON-mode forced. |
| Security | `helmet` ^8, `express-rate-limit` ^8.5, `zod` ^4, `envalid` ^8 (replaces unmaintained dotenv-safe), `pino` ^9 + `pino-http` ^10 | Standard 2026 Express stack. Zod schemas double as LLM JSON-schema source. |
| Hosting | Vercel (SPA) + single Fly Machine + Volume + **Litestream → R2/Tigris** | One family = one machine. LiteFS is multi-instance replication — wrong tool. |
| DB | Stay `sqlite3` ^6 for POC, WAL mandatory | `better-sqlite3` migration worth doing later — couples to route-decomp refactor. |
| Frontend | `react-router-dom` + `@tanstack/react-query` or Zustand | Kill optimistic-fire-and-forget pattern; enable deep links. |

## Table-Stakes Features per Module

**Module 1 — Document Vault:** Drive folder watch (60s poll); auto-classification into category enum; expiry extraction with source-substring verification; configurable reminders (60d/30d/7d/1d); browse + search; preview/download; per-family-member assignment (LLM proposes, user confirms); manual override of every AI decision; encryption at rest + transport.

**Module 2 — School Hub:** Per-child profiles (with aliases for "Sara/Sarah" disambiguation); manual school-comms input (paste/PDF/photo) — no email connector in v1; task extraction with explicit `child_id` enum; per-child dashboard; due-date reminders reusing Module 1 pipeline; task complete/dismiss; source linkback.

**Cross-cutting:** Email/password auth (existing — harden); family unit as primary entity with `family_id` FK on every domain table day 1; family-member profiles with role; Drive OAuth + refresh tokens per family; Telegram bot with `/link <code>` pairing bound to `chat_id`; server-side OpenRouter proxy; single `routeEvent({source, payload, family_ctx})`; confidence scoring + JSON-schema validation; per-family monthly cost cap with 80% alert; LLM audit log; quiet hours; reminder dedup; inline-button confirmations.

## Core Architecture Pattern

```
Browser (React SPA — refactored into features/{auth,docs,school,settings})
       │ /api/* (JWT)
       ▼
┌─ Single Express process on Fly.io (1 machine, 1 SQLite volume) ─┐
│  Adapters:  /api/*    /webhooks/drive    /webhooks/telegram     │
│                  └──────┬──────┘                                │
│                         ▼                                       │
│              LLM Router (routeEvent)                            │
│           classify → load ctx → OpenRouter (JSON mode)          │
│                    ┌────┴────┐                                  │
│                    ▼         ▼                                  │
│           docs-vault    school-hub        (no cross-imports)    │
│                    └────┬────┘                                  │
│                         ▼                                       │
│           Repositories (every query takes familyId)             │
│                         ▼                                       │
│                SQLite + WAL + Litestream                        │
│                                                                 │
│  In-process scheduler (croner): poll Drive, fire reminders,     │
│  renew Drive watch channels, daily digest                       │
└─────────────────────────────────────────────────────────────────┘
```

**Pattern:** One Node process. Three input adapters converge on **one `routeEvent()` function** that classifies intent, dispatches to a module, which writes through `family_id`-scoped repositories. Splitting into microservices = deploy/observability cost for zero benefit at single-family scale. **Modules never import each other** — cross-module coordination happens at the router or through shared repos. Scheduler is a module, not a process.

## Top 6 Critical Pitfalls

| # | Pitfall | Prevention | Phase Owner |
|---|---------|------------|-------------|
| **C6** | Cross-family data leak via missing `family_id` filter (catastrophic at v2) | `family_id NOT NULL` on every domain table day 1; centralize via repositories that **require** `familyId`; CI grep lint for `FROM <table>` without `WHERE family_id` | **Phase 1 — Security & Foundation** |
| **C4** | Prompt injection from docs/Telegram (router executes attacker instructions) | Wrap untrusted content in delimited blocks; `response_format: json_object` with strict schema; action whitelist enum; verify output `family_id` matches source | **Phase 4 — LLM Router** |
| **C5** | Hallucinated expiry dates (LLM fabricates plausible dates) | Require `expiry_date` + `expiry_date_source_text` substring; validate substring exists in OCR; confidence ≥0.7 else human review; sanity bounds | **Phase 4 — Doc classification** |
| **C1** | Drive `changes` page token loss → silent data divergence | Persist `page_token` per family on every page; cold-start reconciliation via `files.list(modifiedTime ≥ last_sync)`; 24h heartbeat reconciliation | **Phase 4 — Drive watcher** |
| **C2** | Reminder duplication after restart / cron overlap | **Claim-then-send**: `UPDATE ... SET sent_at WHERE sent_at IS NULL` first, check `changes=1`, then call Telegram; unique constraint on `(member_id, doc_id, kind, scheduled_date)` | **Phase 5 — Reminder pipeline** |
| **C3** | Missed reminders after Fly downtime (tick-window cron skips outage) | Query `scheduled_at <= now() AND sent_at IS NULL`, not tick-window; catch-up pass on boot; late-threshold flag | **Phase 5 — Reminder pipeline** |

**Honorable mentions:** M14 (DST/timezones — store `(tz, local_date, local_time)` triple), M11 (LLM cost runaway — per-family daily budget day 1), M9 (Telegram wrong-chat sends — bind `chat_id` at pairing), M15 (Fly volume single-attach — `count=1` in fly.toml).

## Recommended Phase Ordering

Synthesis across all four docs. **Input to roadmapper — phase count, exact scope, and gates are the roadmapper's call.**

| # | Phase | Why this order | Depends on | Research-flag |
|---|-------|----------------|------------|---------------|
| **1** | **Security & Foundation** — server-side OpenRouter proxy; gitignore + secret rotation; JWT secret env validation; helmet + rate-limit + CORS allowlist; zod validation; pino with PII redaction; fix wrong model slug; gate Hassan seed | Cannot ship before this. Everything else assumes server-side LLM. | — | NO |
| **2** | **Backend skeleton refactor + data model evolution** — split `server.js` into `adapters/rest.js` + `db/repos/` + `middleware/`; add migrations folder; add `families`, `children`, `family_id` FK on existing tables, `drive_state`, `telegram_chats`, `reminders_sent`; backfill | Subsequent modules need clean import points and `family_id` scoping baked in. | Phase 1 | NO |
| **3** | **Frontend modularization** — extract Lockscreen/DocsTab/etc. from 3,643-line `App.jsx`; move fixtures to `src/fixtures/` gated by DEV; add Zustand + React Query + react-router; replace optimistic-fire-and-forget | Parallelizable with Phase 4 but blocks Phase 6 UI. | Phase 2 | NO |
| **4** | **LLM router + Drive integration (Module 1 core)** — build `router/`, `services/drive/`, `modules/docs-vault/`; OAuth + refresh tokens; page-token persistence; polling sync; classification with confidence + source-text validation; prompt-injection hardening; per-family cost guard | Core thesis. If drop-file → classified-in-DB doesn't work end-to-end, the whole product model is wrong. | Phases 1, 2 | **YES** — OAuth flow, page-token persistence, prompt-injection guard implementation |
| **5** | **Telegram + Reminder loop** — webhook setup with secret token; pairing via `/link <code>`; `telegramSender`; croner `scheduler/reminders.js` with claim-then-send + catch-up + tz-aware + daily digest default | Closes the value loop. Reminder scheduler needs Module 1 data. | Phase 4 | **YES** — timezone handling (luxon/date-fns-tz), conversational state machine |
| **6** | **School Hub module** — `modules/school-hub/`; children CRUD; manual paste/upload; task extraction with explicit `child_id` enum; per-child dashboard; weekly digest | Pure incremental module if Phase 4 + 5 boundaries are right. | Phases 3, 4, 5 | NO |
| **7** | **Real onboarding** — remove Hassan seed; first-run flow (create family → add children → connect Drive → pair Telegram); Litestream wired; `count=1` locked; restore drill | Last — every prior phase uses hardcoded family during dev. Backup drill before real-family prod. | All | NO |

**Note on user's "coarse" granularity setting:** 7 phases above is a logical decomposition. The roadmapper may merge Phases 1+2, Phases 4+5, etc. to fit 3-5 coarse phases. Suggested coarse grouping: (A) Foundation = 1+2, (B) Frontend refactor = 3, (C) Vault + router + Drive = 4, (D) Telegram + reminders + school = 5+6, (E) Onboarding & prod = 7.

**Critical ordering note:** Phase 4 is the thesis-validating phase. Do not start Phase 6 until Phase 4 + 5 are stable, or you'll debug two modules' bugs simultaneously.

## Key Decisions Already Locked (from PROJECT.md)

| Decision | Outcome |
|---|---|
| Keep current stack (Vite+React+Express+SQLite+OpenRouter) | Locked for POC |
| Single-family POC before multi-tenant SaaS | Locked |
| Google Drive primary input, Telegram secondary | Locked (both → same LLM router) |
| Single LLM router for file + chat | Locked |
| Phase 1 = security hardening before features | Locked |
| Telegram only (defer WhatsApp) | Locked |
| Email connector deferred to v2 | Locked |
| GSD = planning only, not runtime dep | Locked |

Out of scope (do not re-litigate): Gmail/IMAP v1, user-editable AI prompts, calendar+grades, WhatsApp, iCloud/Dropbox, multi-tenant infra, mobile native, standalone test phase, local-daemon watcher.

## Open Questions Surfaced by Research

| Question | Owning Phase |
|---|---|
| OAuth scopes — `drive.file` vs `drive.readonly` on folder | Phase 4 |
| Move-vs-shortcut for Drive auto-organization | Phase 4 |
| `better-sqlite3` migration timing | Phase 2 or later |
| Telegram pairing UX — group vs DM vs per-member | Phase 5 |
| Default LLM model slug + fallback chain composition | Phase 4 |
| Cost-cap threshold per family ($/day) | Phase 4 |
| Recurring-task detection — v1.5 or v2? | Phase 6 |
| Conversational state machine design for Telegram | Phase 5 |
| Reminder digest vs individual sends default | Phase 5 (lean digest-default per m8) |
| Shared Drive vs My Drive UX at connect time | Phase 4 |

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | **HIGH** | Verified vs npm + official docs + 2026 ecosystem comparisons. |
| Features | **MEDIUM-HIGH** | Competitor features verified via official pages; AI-native wedge is gap-derived but defensible. |
| Architecture | **HIGH** structural, **MEDIUM** Drive/Telegram specifics | Single-process pattern well-trodden; webhook recipes from official docs need Phase 4/5 validation. |
| Pitfalls | **HIGH** API-mechanic + LLM-output; **MEDIUM** family-scoping/school-comms | Latter are *patterns to design against* given schema not finalized. |
| Overall | **HIGH** | Four files agree with each other and PROJECT.md. Disagreements resolved (poll-Phase-4 / push-v2). |

**Biggest gap:** Real-world LLM accuracy on multi-locale documents (UAE/UK family docs) — only dogfood in Phase 4 resolves this.
