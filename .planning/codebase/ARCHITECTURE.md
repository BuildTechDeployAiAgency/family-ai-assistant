<!-- refreshed: 2026-05-20 -->
# Architecture

**Analysis Date:** 2026-05-20

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                         Browser (Client)                     │
│   React 19 SPA — single root component                       │
│   `src/main.jsx` → `src/App.jsx` (mounted at #root)          │
├──────────────────┬──────────────────┬───────────────────────┤
│  Tab: Documents  │   Tab: Inbox     │    Tab: Actions       │
│  (in App.jsx)    │   (in App.jsx)   │    (in App.jsx)       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │ fetch /api/*     │ fetch /api/*       │ fetch /api/*
         │                  │                    │
         │       ┌──────────┴──────────┐         │
         │       │ Vite dev server      │ (dev only — proxy)
         │       │ `vite.config.js`     │
         │       │ /api → :5000         │
         │       └──────────┬───────────┘
         │                  │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│             Express API server (Node) — :5000                │
│             `server/server.js`                               │
│                                                              │
│   /api/auth/*       /api/documents      /api/emails          │
│   /api/tasks        (static dist/ in production)             │
│                                                              │
│   JWT middleware: `server/middleware.js`                     │
└────────────────────────────┬────────────────────────────────┘
                             │ Promise wrapper
                             ▼
┌─────────────────────────────────────────────────────────────┐
│   SQLite (file)    `server/database.db`                      │
│   Schema bootstrapped in `server/db.js::initializeSchema`    │
│   Tables: users, documents, emails, tasks                    │
└─────────────────────────────────────────────────────────────┘

External (browser → third party, bypasses server):
┌─────────────────────────────────────────────────────────────┐
│   OpenRouter API  `https://openrouter.ai/api/v1/...`         │
│   Called directly from `src/App.jsx` (callOpenRouter)        │
│   Auth via `VITE_OPENROUTER_API_KEY` or localStorage key     │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| HTML shell | Loads fonts/icons, mounts React root | `index.html` |
| React entrypoint | Bootstraps `<App/>` into `#root` | `src/main.jsx` |
| `App` (default export) | Entire SPA: state, data fetching, tab switching, modals, AI orchestration, document/email/task UI | `src/App.jsx` |
| `Lockscreen` | Login + register form, calls `/api/auth/*` | `src/App.jsx:3383` |
| Express app | HTTP API + static file server for `dist/` | `server/server.js` |
| `authenticateToken` | JWT bearer-token guard for protected routes | `server/middleware.js` |
| `query` helpers | Promise-wrapped sqlite3 `get`/`all`/`run`/`exec` | `server/db.js` |
| Schema bootstrap | `CREATE TABLE IF NOT EXISTS` on startup | `server/db.js::initializeSchema` |
| Vite dev proxy | Forwards `/api/*` to `:5000` in dev | `vite.config.js` |

## Pattern Overview

**Overall:** Two-process monolith — a Vite-built React SPA talks to a single Express + SQLite API server. There is no client-side router; the app uses tab state. There is no component library; all UI is inlined into one 3600-line `App.jsx`.

**Key Characteristics:**
- Single-file React frontend — one component (`App`) owns nearly all state and renders all three tabs inline.
- Stateless REST API with JWT bearer auth (30-day expiry) and SQLite as the only persistence layer.
- AI calls (OpenRouter) happen **client-side**, not through the server — the API key lives in the browser (`VITE_OPENROUTER_API_KEY` or `localStorage.openrouter_api_key`).
- Local-first UX: many state slices are seeded from `localStorage` and re-hydrated on mount, then mirrored to the server.
- Mobile-first single-page experience — tab bar at bottom switches between Documents / Inbox / Actions inside the same component.

## Layers

**Client (React SPA):**
- Purpose: Render the entire dashboard, manage all UI state, talk to API and OpenRouter.
- Location: `src/`
- Contains: One React app (`App.jsx`), entry (`main.jsx`), global styles (`index.css`, `App.css`), static assets.
- Depends on: React 19, Tailwind v4 (via `@tailwindcss/vite`), browser `fetch`, `localStorage`.
- Used by: The user's browser only.

**API server (Express):**
- Purpose: Auth, CRUD for documents/emails/tasks, serve static client bundle in production.
- Location: `server/`
- Contains: Route handlers (`server.js`), JWT middleware (`middleware.js`), DB helpers and schema (`db.js`).
- Depends on: `express`, `cors`, `bcryptjs`, `jsonwebtoken`, `sqlite3`.
- Used by: The SPA (via `/api/*`).

**Persistence (SQLite):**
- Purpose: Per-user storage of documents, emails, tasks, and user credentials.
- Location: `server/database.db` (committed binary; gitignored if listed).
- Contains: Tables `users`, `documents`, `emails`, `tasks` (see `server/db.js:57-108`).
- Constraint: `ON DELETE CASCADE` from `users` to children.

**External AI (OpenRouter):**
- Purpose: LLM-backed email analysis, document OCR/extraction, action item generation.
- Location: Called from `src/App.jsx:987` (`callOpenRouter`).
- Auth: `VITE_OPENROUTER_API_KEY` env var or runtime-entered key persisted to `localStorage`.

## Data Flow

### Primary Request Path — User opens the app

1. Browser loads `index.html`, which loads `/src/main.jsx`. (`index.html:21`)
2. `main.jsx` mounts `<App/>` into `#root`. (`src/main.jsx:6`)
3. `App` reads `family_jwt_token` from `localStorage`. (`src/App.jsx:662`)
4. `useEffect` calls `GET /api/auth/me` with `Authorization: Bearer <token>` to verify session. (`src/App.jsx:825-835`)
5. On success, a second `useEffect` fetches `/api/documents`, `/api/emails`, `/api/tasks` in parallel. (`src/App.jsx:858-879`)
6. If the server has no rows for the user yet, the client bulk-seeds from `INITIAL_DOCUMENTS` / `INITIAL_EMAILS` via `POST /api/documents` and `POST /api/emails/sync`, then re-fetches. (`src/App.jsx:763-805,899-905`)
7. UI renders the active tab (`activeTab` state, default `'documents'`). (`src/App.jsx:652,2204,2414,2531`)

### Authentication flow

1. Unauthenticated user sees `<Lockscreen/>` (`src/App.jsx:3383`).
2. Submit calls `POST /api/auth/register` or `POST /api/auth/login`. (`server/server.js:20,64`)
3. Server bcrypt-compares password (`server/server.js:78`), signs JWT with `JWT_SECRET` (default fallback in source — see CONCERNS), 30-day expiry.
4. Client stores token in `localStorage.family_jwt_token` and in React state.
5. Every subsequent `/api/*` call sends `Authorization: Bearer <token>`; `authenticateToken` validates and attaches `req.user`. (`server/middleware.js:5-22`)

### Email analysis flow (AI)

1. User selects email(s) in the Inbox tab.
2. `handleAnalyzeEmail` is called (`src/App.jsx:1026`).
3. If `apiKey` is set, `callOpenRouter` POSTs to `https://openrouter.ai/api/v1/chat/completions` directly from the browser. (`src/App.jsx:987`)
4. Response is parsed by `cleanAndParseJSON` (`src/App.jsx:1012`) and merged into `analysisResults` state.
5. Derived action items and tasks are persisted via `POST /api/tasks` and may flip the active tab to `'actions'`. (`src/App.jsx:1223,1652`)
6. Without an `apiKey`, the client falls back to `MOCK_AI_RESPONSES` for canned demo data. (`src/App.jsx:1034-1037`)

### Document scan flow

1. User uploads / captures an image; it is stored as a base64 Data URL in `scannerImage` state. (`src/App.jsx:725`)
2. Client posts the image (within JSON body, limit 10 MB — `server/server.js:13`) to OpenRouter for vision extraction.
3. Parsed result drives `POST /api/documents` to persist. (`src/App.jsx:1360,1459`)

## State Management

- **No external store** — no Redux, Zustand, Context, or React Query.
- All state lives inside `App` as `useState` hooks (~40+ hooks declared between `src/App.jsx:652-749`).
- Cross-cutting concerns handled with `useEffect`:
  - Token bootstrap & session verify (`src/App.jsx:825`)
  - Initial data fetch & seeding (`src/App.jsx:858`)
  - LocalStorage mirroring for several slices (`src/App.jsx:927-952`)
- Persistence model: every mutation calls the API (`fetch('/api/...')`) AND updates local React state optimistically.
- `localStorage` is used both as a session cache and for: `family_jwt_token`, `openrouter_api_key`, `analysisResults`, `renewalPlans`, `renewalStepsProgress`, `completedActionIds`, `customScannedActions`.

## Routing

- **No client-side router.** No `react-router-dom` dependency. Navigation is driven by `activeTab` state with three values: `'documents'`, `'inbox'`, `'actions'`. (`src/App.jsx:652,2204,2414,2531`)
- Unauthenticated state renders `<Lockscreen/>` instead of the dashboard — gated on `token`/`user` state. (`src/App.jsx:662-663`)
- Server has no URL routing beyond explicit Express routes; all non-`/api` paths fall through to `express.static('dist')`. (`server/server.js:409`)

## Key Abstractions

**`activeTab` (string union):**
- Purpose: Controls which of three views renders inside `App`.
- Values: `'documents' | 'inbox' | 'actions'`.
- Examples: `src/App.jsx:652`, switching at lines `1223, 1880, 1888, 2204, 2414, 2531, 2766, 2787`.

**`REFERENCE_DATE` (hard-coded "today"):**
- Purpose: Fixed POC "now" for deterministic expiry/urgency math.
- Value: `'2026-05-19'`.
- Used both client-side (`src/App.jsx:7`) and server-side (`server/server.js:122,162`).

**`query` (Promise-wrapped sqlite3):**
- Purpose: Avoid callback hell in route handlers; expose `get`, `all`, `run`, `exec`.
- Location: `server/db.js:19-55`.

**`authenticateToken` middleware:**
- Purpose: Decode JWT and bind `{ id, email, family_name }` to `req.user`.
- Location: `server/middleware.js:5`.

## Entry Points

**Client entry:**
- Location: `src/main.jsx`
- Triggers: `<script type="module" src="/src/main.jsx">` in `index.html`.
- Responsibilities: Create React root, render `<StrictMode><App/></StrictMode>`.

**Server entry:**
- Location: `server/server.js`
- Triggers: `npm run server` or `npm run dev` (via `concurrently`).
- Responsibilities: Configure middleware (CORS, JSON 10 MB), declare all `/api/*` routes, serve `dist/`, listen on `PORT` (default `5000`).

**Dev entry:**
- `npm run dev` → `concurrently "vite" "node server/server.js"` (see `package.json:7`).

## Architectural Constraints

- **Single React component:** `src/App.jsx` is ~3,643 lines containing 40+ hooks, all three tabs, all modals, all helpers, and `<Lockscreen/>`. Adding new UI further inflates this file.
- **Threading:** Standard Node single-event-loop; `sqlite3` callbacks dispatch on its internal worker pool. No worker threads, no clustering.
- **Body-size cap:** `express.json({ limit: '10mb' })` to accommodate base64 image uploads (`server/server.js:13`).
- **Reference date is hard-coded** in two places (`src/App.jsx:7`, `server/server.js:122,162`). Any "today" logic outside these locations risks drift.
- **JWT secret has a default** in source (`'family-ai-secret-key-2026'`) on both `server/server.js:10` and `server/middleware.js:3` — see CONCERNS.
- **CORS is wide open** (`app.use(cors())` with no options) — see CONCERNS.
- **No client-side router** — deep linking to a specific tab/document/email is not possible; refresh always returns to `activeTab='documents'`.
- **AI key lives in the browser** — calls to OpenRouter happen from the client; the secret is exposed via `VITE_*` env or `localStorage`.

## Anti-Patterns

### God Component

**What happens:** `src/App.jsx` holds the entire UI: state declarations, fetch logic, mock data, AI orchestration, all three tabs, all modals, and the lockscreen — ~3,600 lines in a single component.
**Why it's wrong:** Re-renders are wasteful (any state change re-evaluates the whole tree), code review and conflict resolution are painful, and the file is hard to navigate.
**Do this instead:** Extract per-tab components (`DocumentsTab`, `InboxTab`, `ActionsTab`) into `src/components/`, lift shared state into a small context or a Zustand store, move helpers (`parseDate`, `getDaysDifference`, `getDocumentStatus` at `src/App.jsx:384-393`) into `src/lib/`.

### Mock data living inside production code

**What happens:** `INITIAL_DOCUMENTS`, `INITIAL_EMAILS`, `MOCK_AI_RESPONSES`, `DEFAULT_RENEWAL_PLANS` are large literals embedded directly in `src/App.jsx` (lines 17-650).
**Why it's wrong:** Demo data ships in every bundle and is indistinguishable from production logic.
**Do this instead:** Move to `src/fixtures/` (or `src/mocks/`) and import conditionally based on `import.meta.env.DEV` or a `?demo=1` query flag.

### Default secrets in source

**What happens:** `JWT_SECRET = process.env.JWT_SECRET || 'family-ai-secret-key-2026'` in both `server/server.js:10` and `server/middleware.js:3`.
**Why it's wrong:** If `JWT_SECRET` is unset in production, all signed tokens use a publicly known string.
**Do this instead:** Throw at boot when `JWT_SECRET` is missing in non-dev environments, and read it from a single shared module instead of duplicating.

### Client-held third-party API key

**What happens:** `VITE_OPENROUTER_API_KEY` is exposed to the browser bundle, and a user-entered key is stored in `localStorage` (`src/App.jsx:654`).
**Why it's wrong:** Any visitor of the deployed app can read the key from devtools and burn quota.
**Do this instead:** Proxy AI calls through a new `/api/ai/*` Express route that injects the key server-side.

## Error Handling

**Strategy:** Try/catch around DB operations on the server with `console.error` + 500 JSON responses (`server/server.js:57,95,142,193,215,278,309,353,381,401`). Client uses try/catch around `fetch` calls and surfaces errors via `setAiError` / `setNotification` state, plus `console.error` (`src/App.jsx`).

**Patterns:**
- Server returns `{ error: '<message>' }` with appropriate 4xx/5xx status.
- Client logs errors and shows ephemeral notifications, but does not block the UI; many failures are silent.
- No central error boundary — a thrown render error will unmount the entire app.

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` only — no structured logger on either side.
**Validation:** Manual field checks at the top of each handler (e.g., `server/server.js:23,67,151,250,340`). No schema library (zod, joi).
**Authentication:** JWT bearer tokens issued by `/api/auth/login` and `/api/auth/register`, verified by `authenticateToken` middleware. All `/api/documents`, `/api/emails`, `/api/tasks` routes require it; `req.user.id` scopes every query.
**Authorization:** Row-level filtering by `user_id` on every read and mutation (`WHERE user_id = ?`). No roles.
**Configuration:** `.env` file at project root for `VITE_OPENROUTER_API_KEY`, `VITE_OPENROUTER_MODEL`. Server reads `PORT` and `JWT_SECRET` from `process.env` only.

---

*Architecture analysis: 2026-05-20*
