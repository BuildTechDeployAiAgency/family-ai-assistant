# Architecture — Family AI Assistant (Refactor Target)

**Domain:** Cloud-drive-watched doc vault + Telegram-driven family chat + LLM router dispatching to module handlers
**Researched:** 2026-05-20
**Confidence:** HIGH on structural patterns (well-trodden), MEDIUM on Drive/Telegram specifics (verified via official docs and ecosystem consensus)

---

## TL;DR Recommendation

**One Node process. Three input adapters, one router, N module handlers, one scheduler.**

Do NOT split into microservices for the POC. Keep a single Express process on Fly.io that mounts:

1. `/api/*` — REST for the React SPA (existing surface, refactored)
2. `/webhooks/drive` — Google Drive push notifications
3. `/webhooks/telegram` — Telegram webhook
4. An in-process scheduler (`node-cron` or `setInterval`) for reminders

All three inputs converge on a single `routeEvent({ source, payload, family_id })` function. The router is a *module*, not a process. Splitting into separate services adds deploy/observability cost for zero benefit at single-family scale.

---

## Component Diagram

```text
┌──────────────────────────── Browser (React 19 SPA) ────────────────────────────┐
│                                                                                 │
│  src/features/auth/      src/features/docs/    src/features/school/             │
│  src/features/settings/  src/features/chat/(opt)                                │
│                                                                                 │
│  Shared: src/lib/api.ts  src/lib/store.ts (Zustand)  src/components/ui/         │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │ fetch /api/*  (JWT bearer)
                                  ▼
┌─────────────────── Single Node process on Fly.io (Express) ─────────────────────┐
│                                                                                  │
│   INPUT ADAPTERS                                                                 │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐   │
│   │ /api/* REST         │  │ /webhooks/drive     │  │ /webhooks/telegram   │   │
│   │ (SPA mutations)     │  │ (Google push)       │  │ (bot updates)        │   │
│   └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬───────────┘   │
│              │                        │                        │                │
│              │              ┌─────────▼────────┐               │                │
│              │              │ DriveSyncService │ pulls changes │                │
│              │              │ (page-token API) │               │                │
│              │              └─────────┬────────┘               │                │
│              │                        │                        │                │
│              └────────────────────────┼────────────────────────┘                │
│                                       ▼                                         │
│                          ┌────────────────────────────┐                         │
│                          │  LLM Router (in-process)   │                         │
│                          │  routeEvent(source, payload│                         │
│                          │             family_ctx)    │                         │
│                          │  → classify intent/module  │                         │
│                          │  → load module context     │                         │
│                          │  → call module.handle()    │                         │
│                          └─────┬──────────┬───────────┘                         │
│                                │          │                                     │
│                ┌───────────────┘          └───────────────┐                     │
│                ▼                                          ▼                     │
│   ┌──────────────────────┐                  ┌──────────────────────┐            │
│   │ Module: docs-vault   │                  │ Module: school-hub   │            │
│   │  - classify file     │                  │  - extract tasks     │            │
│   │  - extract expiry    │                  │  - tag child         │            │
│   │  - move in Drive     │                  │  - write tasks       │            │
│   │  - write documents   │                  │                      │            │
│   └──────────┬───────────┘                  └──────────┬───────────┘            │
│              │                                         │                        │
│              └────────────────┬────────────────────────┘                        │
│                               ▼                                                 │
│                   ┌────────────────────────┐                                    │
│                   │ Repositories (db/)     │                                    │
│                   │  - familiesRepo        │                                    │
│                   │  - documentsRepo       │                                    │
│                   │  - tasksRepo           │                                    │
│                   │  - childrenRepo        │                                    │
│                   │  - driveStateRepo      │                                    │
│                   │  - telegramChatsRepo   │                                    │
│                   └────────────┬───────────┘                                    │
│                                ▼                                                │
│                       ┌────────────────┐                                        │
│                       │ SQLite (volume)│                                        │
│                       └────────────────┘                                        │
│                                                                                 │
│   SCHEDULER (in-process)                                                        │
│   ┌────────────────────────────────────────────────────────────────────────┐   │
│   │ ReminderScheduler — cron tick → scan tasks/documents → send via       │   │
│   │ TelegramSender (outbound side of Telegram adapter)                    │   │
│   └────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ outbound
                          ┌────────────┴─────────────┐
                          ▼                          ▼
                ┌──────────────────┐       ┌──────────────────┐
                │ OpenRouter API   │       │ Telegram Bot API │
                │ Google Drive API │       │                  │
                └──────────────────┘       └──────────────────┘
```

---

## Component Boundaries

| Component | Owns | Does NOT do | Talks to |
|-----------|------|-------------|----------|
| **Input adapters** (`server/adapters/`) | Decode the source's wire format; verify signature/token; produce a normalized `Event` | Business logic, DB writes, LLM calls | Router only |
| **DriveSyncService** (`server/services/drive/`) | Drive OAuth tokens per family, page-token state, fetching change lists, downloading file contents | Classifying or interpreting files | Drive API, router |
| **LLM Router** (`server/router/`) | Build prompt with family context; classify intent → module; call OpenRouter; dispatch | DB writes, side-effects | OpenRouter, modules |
| **Modules** (`server/modules/{docs,school}/`) | Domain logic, prompts specific to module, DB writes, Drive moves, queueing notifications | Cross-module knowledge (no module imports another module) | Repos, Drive client, Telegram sender |
| **Repositories** (`server/db/repos/`) | All SQL; map snake_case ↔ camelCase | Validation, business rules | SQLite |
| **TelegramSender** (`server/services/telegram/`) | Outbound sendMessage, message formatting | Inbound parsing (that's the adapter) | Telegram Bot API |
| **ReminderScheduler** (`server/scheduler/`) | Periodic scan, dispatch reminder events back through the router (or directly to TelegramSender for simple cases) | Domain reasoning | Repos, TelegramSender |
| **Frontend features** (`src/features/*`) | Single feature surface; own state, own API calls | Other features' state | `lib/api.ts`, shared store |

**Hard rule:** Modules never call each other. Cross-module coordination happens at the router or via shared repos.

---

## Data Flows

### Flow 1 — Drive file dropped

1. User drops `passport-yusuf.pdf` in the family Drive folder.
2. Google pushes empty `POST /webhooks/drive` with `X-Goog-Resource-State: change` and `X-Goog-Channel-Id` headers ([Google Drive push docs](https://developers.google.com/drive/api/guides/push)).
3. `driveAdapter` verifies channel ID → resolves `family_id` → enqueues an internal `DriveChangeEvent`. Responds 200 immediately.
4. `DriveSyncService.pullChanges(family_id)` reads stored `page_token`, calls `changes.list`, downloads new/modified file metadata + content, advances page token. ([Drive Changes guide](https://developers.google.com/drive/api/guides/manage-changes))
5. For each new file → `router.routeEvent({ source: 'drive', payload: { fileId, mime, content }, family_ctx })`.
6. Router calls LLM to classify: which module + which subcategory? Returns `{ module: 'docs-vault', category: 'passport', child_id?: 'yusuf' }`.
7. `docsVault.handle()`:
   - Calls LLM again (or same call structured-output) to extract `{ expiry_date, document_number, holder }`.
   - Moves file in Drive to `/Family/Passports/Yusuf/` via Drive API.
   - `documentsRepo.insert({ family_id, child_id, category, drive_file_id, expiry_date, ... })`.
   - If `expiry_date` within reminder window → enqueue task via `tasksRepo`.
8. SPA sees new doc on next fetch (or via SSE if added later).

### Flow 2 — Telegram message

1. User: "When does Aisha's passport expire?"
2. Telegram POSTs to `/webhooks/telegram` (registered via `setWebhook` once at deploy).
3. `telegramAdapter` verifies the secret token header → resolves `family_id` from `chat_id` via `telegramChatsRepo` → builds `ChatEvent`.
4. `router.routeEvent({ source: 'telegram', payload: { text }, family_ctx })`.
5. Router classifies → `{ module: 'docs-vault', intent: 'query' }`. (For pure Q&A, router may answer directly using a RAG-lite over repos.)
6. Module fetches relevant docs from repo, builds an answer prompt, replies via `telegramSender.send(chat_id, text)`.

### Flow 3 — Scheduled reminder

1. `node-cron` fires hourly: `scheduler.tick()`.
2. Scheduler queries `documentsRepo.findExpiringWithin(family_id, days=30)` and `tasksRepo.findDueWithin(...)`.
3. For each hit not yet notified (track in `reminders_sent` table or `notified_at` column):
   - Optionally pass through router to draft a friendly message, OR use a templated message for simplicity.
   - `telegramSender.send(family.telegram_chat_id, msg)`.
   - Mark `notified_at`.

---

## Drive Watch State — Concrete Recipe

This is the part most people get wrong:

1. **One-time per family:** OAuth Drive read/write scope; store `refresh_token` in `family_drive_auth`. Call `changes.getStartPageToken()` → store as `page_token`.
2. **Subscribe:** `changes.watch({ pageToken, address: 'https://app.fly.dev/webhooks/drive', id: <uuid>, type: 'web_hook' })`. Store `channel_id`, `resource_id`, `expiration` in `drive_watch_channels`.
3. **Renewal:** Watch channels expire (~7 days max). Scheduler must renew before expiration — separate cron job `renewWatchChannels()` running daily.
4. **On webhook:** Verify `X-Goog-Channel-Id` matches a known channel → enqueue pull (do not process inside the webhook handler; return 200 fast).
5. **Pull:** `changes.list({ pageToken, fields: 'changes(file(id,name,mimeType,parents,trashed)),newStartPageToken,nextPageToken' })`. Page through, then save `newStartPageToken`.
6. **Fallback:** Even with push, run a polling tick every 6h to catch missed events (Google does not guarantee delivery).

**Watch state table:**
```sql
CREATE TABLE drive_state (
  family_id TEXT PRIMARY KEY,
  page_token TEXT NOT NULL,
  channel_id TEXT,
  resource_id TEXT,
  channel_expiration INTEGER,  -- ms epoch
  updated_at INTEGER NOT NULL
);
```

---

## Telegram: Webhook, Not Polling

**Decision: webhook.** On Fly.io specifically:

- Long polling means the process can never sleep (outbound connection held open). Fly machines that auto-stop won't.
- Telegram returns `409 Conflict` if two getUpdates run concurrently — bad if Fly ever runs two instances during a deploy.
- Webhook lets Fly auto-stop the machine when idle (within constraints — see Pitfalls).

**Setup:**
1. On boot, call `setWebhook(url='https://app.fly.dev/webhooks/telegram', secret_token=<random>)` (idempotent, do it on every deploy).
2. Verify `X-Telegram-Bot-Api-Secret-Token` header on every inbound request.
3. Respond 200 within 60s — push heavy work to a setImmediate / queue, return 200 immediately.

**Linking chat → family:** First time a user messages the bot, prompt for a one-time pairing code generated in the SPA. Store mapping in `telegram_chats (family_id, chat_id, user_id)`.

---

## Folder Layout (Refactored)

### Backend

```
server/
├── server.js                      # Express bootstrap, mount routers
├── env.js                         # Boot-time env validation (NEW — fixes JWT default)
├── adapters/
│   ├── rest.js                    # /api/* router (was server.js routes)
│   ├── drive-webhook.js           # /webhooks/drive
│   └── telegram-webhook.js        # /webhooks/telegram
├── middleware/
│   ├── auth.js                    # was middleware.js
│   ├── validate.js                # zod schema validation (NEW)
│   └── rate-limit.js              # NEW
├── router/
│   ├── index.js                   # routeEvent()
│   ├── classify.js                # LLM classification prompt + call
│   └── context.js                 # build family_ctx for prompts
├── modules/
│   ├── docs-vault/
│   │   ├── index.js               # handle()
│   │   ├── classify.js            # category detection
│   │   ├── extract.js             # expiry/number extraction
│   │   └── prompts.js
│   └── school-hub/
│       ├── index.js
│       ├── extract.js
│       └── prompts.js
├── services/
│   ├── drive/
│   │   ├── client.js              # googleapis wrapper
│   │   ├── sync.js                # pullChanges(family_id)
│   │   ├── watch.js               # watch/renew channels
│   │   └── oauth.js               # token refresh
│   ├── telegram/
│   │   ├── sender.js              # outbound
│   │   └── bot.js                 # setWebhook on boot
│   └── llm/
│       └── openrouter.js          # the proxy (moved from client)
├── scheduler/
│   ├── index.js                   # cron registration
│   ├── reminders.js               # scan & send
│   └── drive-renewal.js           # renew watch channels
├── db/
│   ├── client.js                  # was db.js — query helpers stay
│   ├── schema.js                  # CREATE TABLE statements (was initializeSchema)
│   ├── migrations/                # NEW — file-based migrations
│   └── repos/
│       ├── families.js
│       ├── users.js
│       ├── children.js
│       ├── documents.js
│       ├── tasks.js
│       ├── drive-state.js
│       └── telegram-chats.js
└── lib/
    ├── date.js                    # REFERENCE_DATE removed; real now()
    ├── logger.js                  # pino — replaces console.log
    └── errors.js
```

### Frontend

```
src/
├── main.jsx
├── App.jsx                        # SHELL ONLY: router, auth gate, layout. Target <200 lines.
├── routes.jsx                     # react-router-dom routes (NEW)
├── features/
│   ├── auth/
│   │   ├── Lockscreen.jsx
│   │   ├── useAuth.js
│   │   └── api.js
│   ├── docs/
│   │   ├── DocsTab.jsx
│   │   ├── DocCard.jsx
│   │   ├── DocDetailModal.jsx
│   │   ├── useDocs.js             # Zustand slice or React Query hooks
│   │   └── api.js
│   ├── school/
│   │   ├── SchoolTab.jsx
│   │   ├── ChildSwitcher.jsx
│   │   ├── TaskList.jsx
│   │   └── api.js
│   ├── settings/
│   │   ├── SettingsModal.jsx
│   │   └── DriveConnectButton.jsx
│   └── chat/                      # optional — telegram link/pairing UI
├── components/
│   └── ui/                        # Button, Modal, Input, etc.
├── lib/
│   ├── api.js                     # fetch wrapper, base URL, auth header
│   ├── store.js                   # Zustand root (or React Query client)
│   └── date.js
├── fixtures/                      # MOVED out of App.jsx: INITIAL_DOCUMENTS, etc. Dev-only imports.
└── styles/
    └── index.css
```

---

## Anti-Monolith Rules for Frontend Refactor

1. **No feature imports another feature.** `features/docs` cannot import from `features/school`. Cross-feature data flows through the shared store or via the URL.
2. **Each feature exposes one top-level route component** (e.g., `<DocsTab/>`) and one `api.js`. Internal subcomponents stay inside the feature folder.
3. **`App.jsx` becomes a shell.** Auth gate + router + layout. If it grows past ~200 lines, something is in the wrong place.
4. **Mock data lives in `src/fixtures/`** and is imported only behind `import.meta.env.DEV` gates. Production builds should tree-shake it.
5. **No `useState` for server data.** Use React Query (TanStack Query) or a Zustand slice with explicit `fetch`/`mutate` actions. The current pattern (optimistic local state + fire-and-forget POST) is a class of bug factory.
6. **Add `react-router-dom`** for deep linking. The current "refresh always lands on Documents tab" UX is a regression risk as the app grows.

---

## Build Order (Maps to Phase Ordering)

| Phase | What | Why this order | Depends on |
|-------|------|----------------|------------|
| **0. Security hardening** | Move OpenRouter key to `/api/ai/*` proxy. Gitignore + rotate. JWT secret boot validation. Helmet + rate-limit + CORS allowlist. Zod input validation. | Cannot ship before this. Everything else assumes a server-side LLM call. | — |
| **1. Backend skeleton refactor** | Split `server.js` into `adapters/rest.js` + `middleware/` + `db/repos/`. No behavior change. Add pino logger. Add migrations folder + run existing schema as `0001_initial.sql`. | Subsequent phases need clean import points. Doing this once now is cheaper than doing it inline with feature work. | Phase 0 |
| **2. Data model evolution** | Add `families`, `children`, `family_id` FK on existing tables, `drive_state`, `telegram_chats`, `reminders_sent`. Migration that backfills a single `family_id` for the existing user. Do NOT split per-user → per-family auth yet — single user IS the family for now. | Multi-tenant readiness without multi-tenant complexity. Every later module assumes `family_id` scope. | Phase 1 |
| **3. Frontend modularization** | Extract `Lockscreen`, `DocsTab`, `InboxTab`, `ActionsTab` from `App.jsx`. Move fixtures out. Add Zustand + React Query. Add react-router. Replace optimistic-then-fire-and-forget with proper mutation hooks. | Parallelizable with Phase 4 but blocks Phase 5 (school hub UI). Do this before adding more screens, not after. | Phase 1 |
| **4. LLM router + Drive integration** | Build `router/`, `services/drive/`, `modules/docs-vault/`. Implement OAuth, page-token state, watch channel registration + renewal, webhook handler. End-to-end test: drop file → it appears classified in DB and moved in Drive. | This is the core thesis. Validate before building school hub. | Phases 0, 1, 2 |
| **5. Telegram + Reminder loop** | `/webhooks/telegram`, setWebhook on boot, `telegramSender`, pairing flow, `scheduler/reminders.js`. End-to-end: expiring passport → bot sends reminder → user can ask "what's expiring this month?" and get an answer. | Closes the value loop. Reminder scheduler depends on docs vault having real data. | Phase 4 |
| **6. School hub module** | `modules/school-hub/`, children CRUD UI, per-child task filtering. Reuses router + telegram + scheduler infrastructure from prior phases. | Pure incremental module — should be cheap once 4 and 5 are done. If it's not cheap, Phase 4's boundaries are wrong. | Phases 3, 4, 5 |
| **7. Real onboarding** | Remove Hassan seed. Build first-run flow: create family → add children → connect Drive → pair Telegram. | Last because every prior phase can use the hardcoded family during dev. | All |

**Critical ordering note:** Phase 4 (LLM router + Drive) is where the architectural thesis is proven. If Drive watch + classify + file doesn't work end-to-end, the whole project model is wrong. Do not start Phase 6 (school hub) until Phase 4 + 5 are stable, or you'll be debugging two modules' bugs at once.

---

## Keep vs Rewrite

### KEEP (with minor adjustments)

- `server/db.js` `query` helpers — solid abstraction, just move to `db/client.js`.
- JWT auth flow + bcrypt — fine as-is. Add secret validation, keep the rest.
- Existing `documents`, `tasks` tables — extend with `family_id`, `drive_file_id`, `child_id`, `notified_at` columns via migration. Do not drop and recreate.
- SQLite as DB — explicitly per PROJECT.md constraints. Postgres is a v2 problem.
- Express + Vite + React 19 + Tailwind v4 — entire stack stays.
- `INSERT OR REPLACE` upsert pattern in repos.
- Snake_case DB ↔ camelCase JSON mapping (formalize in repos).

### REWRITE

- `src/App.jsx` (3,643 lines) — extract everything per folder layout above. Do this incrementally, route by route, behind a feature flag if needed.
- Client-side OpenRouter call — fully gone; proxied through server.
- `MOCK_AI_RESPONSES`, `INITIAL_DOCUMENTS`, `INITIAL_EMAILS`, `DEFAULT_RENEWAL_PLANS` — move to `src/fixtures/`, gate behind `DEV` env.
- Hardcoded `REFERENCE_DATE = '2026-05-19'` — replace with `new Date()`. Tests can inject a clock.
- `emails` table and inbox tab — emails are out of scope for v1 per PROJECT.md. Keep the table for now (cheap) but remove the inbox UI; data drives docs vault and school hub instead.
- `JWT_SECRET` defaults in two files — single shared `env.js` that throws when missing.

### ADD

- `families`, `children`, `drive_state`, `drive_watch_channels`, `telegram_chats`, `reminders_sent` tables.
- `/api/ai/*`, `/webhooks/drive`, `/webhooks/telegram` route surfaces.
- `node-cron` (or `croner` — lighter) for scheduler.
- `googleapis` SDK for Drive.
- A Telegram bot library (recommend `grammy` — modern, ESM-first, TypeScript types, used by GramIO post-2024 references).
- `zod` for input validation.
- `pino` for structured logging.
- `helmet`, `express-rate-limit` for Phase 0.
- `react-router-dom`, `@tanstack/react-query` (or `zustand`) for the frontend.

---

## Sources

- [Google Drive Changes guide](https://developers.google.com/drive/api/guides/manage-changes) — HIGH confidence, official
- [Drive changes.watch reference](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/watch) — HIGH confidence, official
- [grammY: Long Polling vs Webhooks](https://grammy.dev/guide/deployment-types) — HIGH confidence, framework docs
- [GramIO: Long Polling vs Webhook](https://gramio.dev/updates/webhook) — MEDIUM confidence, framework docs, recent
- Existing project files: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STACK.md`, `.planning/codebase/CONVENTIONS.md` — HIGH confidence, source of truth
