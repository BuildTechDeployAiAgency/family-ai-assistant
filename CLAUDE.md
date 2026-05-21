<!-- GSD:project-start source:PROJECT.md -->
## Project

**Family AI Assistant**

An AI-powered family operations assistant that watches a shared cloud drive folder and Telegram chat, organizes household documents, tracks expiries and renewals, and surfaces school-related tasks per child. Built for a single family POC first, with the goal of becoming a multi-tenant SaaS product later.

**Core Value:** When a document is dropped in the family folder or a school email is forwarded, the system reliably classifies it, files it correctly, extracts actions and dates, and reminds the right family member at the right time via Telegram.

### Constraints

- **Tech stack**: Vite + React 19 (frontend), Vercel serverless functions under `api/` (backend), Supabase Postgres + Auth + RLS, Upstash Redis for rate-limiting
- **Hosting**: Vercel (frontend + `api/` serverless functions), Supabase (managed Postgres + Auth), Upstash (Redis)
- **AI provider**: OpenRouter (already wired); model choice flexible
- **Chat platform**: Telegram only for v1
- **Cloud drive**: Google Drive only for v1
- **Auth**: Supabase Auth, email/password (no OAuth providers in v1)
- **Scope**: single-family POC — no multi-tenant isolation work in v1, but data model should not block it later
- **Security**: Phase 1 must fix all critical concerns from `.planning/codebase/CONCERNS.md` before any feature work
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ESM, `"type": "module"` in `package.json`) - Both frontend (React JSX) and backend (Node.js Express)
- JSX - React component syntax used in `src/App.jsx`, `src/main.jsx`
- HTML - Single entry document `index.html`
- CSS - `src/index.css`, `src/App.css` (Tailwind v4 driven)
- SQL - Embedded schema in `server/db.js` (SQLite DDL)
## Runtime
- Node.js (ESM) - Runs both Express server (`server/server.js`) and Vite dev server
- Browser runtime - React 19 SPA
- npm
- Lockfile: present (`package-lock.json`, 163KB)
## Frameworks
- React `^19.2.6` - UI framework (`src/App.jsx`, `src/main.jsx`)
- React DOM `^19.2.6` - DOM rendering, `createRoot` API
- Express `^5.2.1` - Backend HTTP server (`server/server.js`)
- Not detected - No test framework configured, no test files present
- Vite `^8.0.12` - Frontend build tool and dev server (`vite.config.js`)
- `@vitejs/plugin-react` `^6.0.1` - React plugin for Vite (Oxc-based)
- `@tailwindcss/vite` `^4.3.0` - Tailwind v4 Vite plugin
- `concurrently` `^9.2.1` - Runs Vite + Express together via `npm run dev`
- PostCSS `^8.5.15` - CSS processing
- Autoprefixer `^10.5.0` - Vendor prefix injection
## Key Dependencies
- `express` `^5.2.1` - REST API server framework
- `sqlite3` `^6.0.1` - Embedded SQL database driver (`server/db.js`, persisted to `server/database.db`)
- `jsonwebtoken` `^9.0.3` - JWT auth token sign/verify (`server/server.js`, `server/middleware.js`)
- `bcryptjs` `^3.0.3` - Password hashing (salt rounds = 10) in `server/server.js`
- `cors` `^2.8.6` - Cross-origin middleware enabled globally
- `react` / `react-dom` `^19.2.6` - SPA shell
- `tailwindcss` `^4.3.0` - Utility-first CSS (configured via Vite plugin, no separate config file)
- `eslint` `^10.3.0` - Linter
- `@eslint/js` `^10.0.1` - JS recommended rules
- `eslint-plugin-react-hooks` `^7.1.1` - React hooks lint rules
- `eslint-plugin-react-refresh` `^0.5.2` - HMR-safe component checks
- `globals` `^17.6.0` - Browser global definitions
- `@types/react` `^19.2.14`, `@types/react-dom` `^19.2.3` - Type stubs (no TS source in repo)
## Configuration
- `.env` file present at project root (loaded by Vite for `VITE_*` vars)
- Server reads `process.env.PORT` and `process.env.JWT_SECRET` directly (no dotenv import detected — relies on shell env)
- Frontend reads `import.meta.env.VITE_*` via Vite's env injection
- JWT secret has insecure fallback default `'family-ai-secret-key-2026'` in `server/server.js:10` and `server/middleware.js:3`
- `vite.config.js` - Vite config (React + Tailwind plugins, dev proxy `/api` → `http://localhost:5000`)
- `eslint.config.js` - Flat ESLint config
- `index.html` - Vite HTML entry (loads `/src/main.jsx` as module)
- No `tsconfig.json` (project is plain JS/JSX)
- No `postcss.config.*` (Tailwind v4 handles via Vite plugin)
- No `tailwind.config.*` (Tailwind v4 zero-config)
## Platform Requirements
- Node.js with ESM support (Node 18+ recommended for Express 5 / Vite 8)
- npm
- Two ports: `5173` (Vite dev) and `5000` (Express API)
- Run: `npm run dev` (uses `concurrently` to start both)
- Build: `npm run build` (Vite outputs to `dist/`)
- Serve: `node server/server.js` — Express serves built bundle via `app.use(express.static('dist'))` at `server/server.js:409`
- Single-process deployment (Express serves both API and static bundle)
- Required env vars: `PORT` (default 5000), `JWT_SECRET` (override the insecure default)
- Persisted SQLite file at `server/database.db` (40KB on disk currently)
## Scripts
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `concurrently "vite" "node server/server.js"` | Run frontend + backend together |
| `server` | `node server/server.js` | Run Express API only |
| `build` | `vite build` | Production frontend bundle to `dist/` |
| `lint` | `eslint .` | Lint all JS/JSX |
| `preview` | `vite preview` | Preview built bundle |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React entry/components: PascalCase `.jsx` — `src/App.jsx`, `src/main.jsx`
- Stylesheets: lowercase paired with component name — `src/App.css`, `src/index.css`
- Server modules: lowercase `.js` — `server/server.js`, `server/db.js`, `server/middleware.js`
- Config: lowercase with dots — `eslint.config.js`, `vite.config.js`
- No `src/components/` subdirectory exists — all UI lives in the monolithic `src/App.jsx`
- Event handlers: `handleX` prefix — `handleSaveSettings`, `handleAddDocument` (`src/App.jsx:1438`, `1446`)
- Utility/helpers: camelCase verbs — `generateMockDocumentImage` (`src/App.jsx:401`), `getDaysDifference` (`src/App.jsx:1452`)
- Server middleware exports: camelCase — `authenticateToken` (`server/middleware.js:5`)
- camelCase for locals and state — `tempKey`, `apiKey`, `scannerLoading`, `newDocData`
- React state setters paired via `useState` destructuring — `[apiKey, setApiKey]`
- SCREAMING_SNAKE_CASE for module-level constants — `REFERENCE_DATE`, `FAMILY_MEMBERS`, `INITIAL_DOCUMENTS`, `INITIAL_EMAILS` (`src/App.jsx:7-30`), `JWT_SECRET`, `PORT` (`server/server.js:9-10`)
- Plain JavaScript only. No TypeScript, no JSDoc type annotations. `@types/react` and `@types/react-dom` are installed as devDependencies but only support editor tooling.
- snake_case in SQLite — `user_id`, `family_name`, `expiry_date`, `password_hash`, `document_number`, `has_attachment`
- Server explicitly maps snake_case DB columns to camelCase JSON for the React client (`server/server.js:121-140`, `230-237`)
## Code Style
- No Prettier config, no `.editorconfig`. Formatting is conventional but not enforced by tooling.
- Indentation: 2 spaces throughout.
- Quotes: single quotes preferred (`'react'`, `'family-ai-secret-key-2026'`). Double quotes appear sporadically in `console.error` strings.
- Semicolons: **inconsistent**. Server code uses semicolons consistently. `src/App.jsx` and `src/main.jsx` omit trailing semicolons (modern JS-no-semi style). Do not "fix" one to match the other — match the file you are editing.
- Trailing commas: used in multi-line object/array literals.
- ESLint 10 flat config at `eslint.config.js`
- Extends: `@eslint/js` recommended, `eslint-plugin-react-hooks` flat recommended, `eslint-plugin-react-refresh` vite config
- Targets: `**/*.{js,jsx}`
- Globals: `globals.browser` (note: this also applies to `server/*.js`, which actually runs in Node — Node globals like `process` are not declared but ESLint does not flag them because they are used as identifiers that exist via the browser/Node overlap or are simply tolerated)
- Ignored: `dist`
- Run: `npm run lint` (executes `eslint .` from project root)
## Import Organization
- ESM throughout. `package.json` declares `"type": "module"`. Both client and server use `import`/`export`.
- Relative imports include the file extension (`./db.js`, `./App.jsx`) — required because of `"type": "module"`.
- None configured. All imports use relative paths or bare package names.
## Error Handling
- Every endpoint wraps DB work in `try { ... } catch (err) { console.error(...); res.status(500).json({ error: '...' }); }`
- Validation errors return `400` with `{ error: '...' }`. Auth failures return `401`/`403`. Missing rows return `404`.
- Error message strings are human-readable, never raw exception text.
- Fetch calls use `.catch(err => console.error("Error ... to SQLite:", err))` — failures are logged but **not surfaced to the UI**. Local React state is updated optimistically regardless of server outcome.
- AI/scanner flows use `try/catch/finally` and write user-visible errors into a `scannerError` state string (`src/App.jsx:1428-1434`).
- Input validation in handlers uses `alert(...)` for required-field checks (`src/App.jsx:1449`).
## Logging
- Server: `console.error('<Action> error:', err)` on every catch. `console.log('Server is running on port ${PORT}')` on boot.
- Client: `console.error(...)` for fetch failures, no `console.log` left in production paths (some remain inside scan flow).
## Comments
- Block headers separate logical sections — server uses `// ---` banner comments between endpoint groups (`server/server.js:15-17`, `112-114`, `220-222`); client uses `// ===` banner comments (`src/App.jsx:3-5`).
- Inline single-line `//` comments explain non-obvious mappings (e.g., `// Map read / has_attachment / processed from 0/1 back to boolean for React`, `server/server.js:229`).
- No JSDoc / TSDoc anywhere in the codebase.
## Function Design
- Server route handlers: 15–60 lines, one handler per route, registered inline on `app`.
- Client: `src/App.jsx` is a **3,643-line single-component file** containing all state, handlers, and JSX. Helper functions (`generateMockDocumentImage`, `getDaysDifference`) are module-level. Event handlers are defined inside the `App` component body.
- Destructuring from `req.body` / `req.params` is the standard server pattern (`const { id, title, ... } = req.body`).
- Client handlers accept either `event` or no arguments; data comes from closed-over state.
- Server: always `res.json(...)` or `res.status(N).json({ error })`. No raw responses.
- Client: handlers are side-effect only (call `setState`, `fetch`, `setNotification`) — they do not return values.
## Module Design
- Server modules use named exports (`export const authenticateToken`, `export const query`).
- Client uses default export for the React component (`export default App`).
- None. No `index.js` re-export files anywhere.
## React Conventions
- React 19 with `StrictMode` (`src/main.jsx:7`).
- Function components only. No class components.
- State via `useState`. Side effects via `useEffect`. No external state library (no Redux, Zustand, etc.).
- Setter callbacks use functional form when depending on prior state — `setCustomScannedActions(prev => [...newActions, ...prev])` (`src/App.jsx:1422`).
- JSX uses Tailwind utility classes inline. Tailwind v4 is loaded via `@tailwindcss/vite` — no `tailwind.config.js` needed for the v4 setup.
- Persistence pattern: localStorage for `openrouter_api_key` and JWT `token`; SQLite via authenticated REST for documents/emails/tasks. Local state updates happen optimistically; the server call is fire-and-forget.
## Server Conventions
- Express 5 app object pattern — single `server/server.js` registers all routes on a flat `app`. No `Router`, no controllers folder.
- Auth via JWT bearer tokens. `authenticateToken` middleware applied per-route (not globally) so `/api/auth/*` can be reached unauthenticated.
- All authenticated queries scope by `user_id = ?` to enforce per-user data isolation.
- DB access through a tiny wrapper `query.get / query.all / query.run` from `server/db.js`. Routes never touch the sqlite3 driver directly.
- `INSERT OR REPLACE` is the standard upsert idiom (`server/server.js:177`, `258`, `346`).
- `JWT_SECRET` falls back to a hardcoded string (`'family-ai-secret-key-2026'`) when the env var is missing — acceptable in dev, must be set in production.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Single-file React frontend — one component (`App`) owns nearly all state and renders all three tabs inline.
- Stateless REST API with JWT bearer auth (30-day expiry) and SQLite as the only persistence layer.
- AI calls (OpenRouter) happen **client-side**, not through the server — the API key lives in the browser (`VITE_OPENROUTER_API_KEY` or `localStorage.openrouter_api_key`).
- Local-first UX: many state slices are seeded from `localStorage` and re-hydrated on mount, then mirrored to the server.
- Mobile-first single-page experience — tab bar at bottom switches between Documents / Inbox / Actions inside the same component.
## Layers
- Purpose: Render the entire dashboard, manage all UI state, talk to API and OpenRouter.
- Location: `src/`
- Contains: One React app (`App.jsx`), entry (`main.jsx`), global styles (`index.css`, `App.css`), static assets.
- Depends on: React 19, Tailwind v4 (via `@tailwindcss/vite`), browser `fetch`, `localStorage`.
- Used by: The user's browser only.
- Purpose: Auth, CRUD for documents/emails/tasks, serve static client bundle in production.
- Location: `server/`
- Contains: Route handlers (`server.js`), JWT middleware (`middleware.js`), DB helpers and schema (`db.js`).
- Depends on: `express`, `cors`, `bcryptjs`, `jsonwebtoken`, `sqlite3`.
- Used by: The SPA (via `/api/*`).
- Purpose: Per-user storage of documents, emails, tasks, and user credentials.
- Location: `server/database.db` (committed binary; gitignored if listed).
- Contains: Tables `users`, `documents`, `emails`, `tasks` (see `server/db.js:57-108`).
- Constraint: `ON DELETE CASCADE` from `users` to children.
- Purpose: LLM-backed email analysis, document OCR/extraction, action item generation.
- Location: Called from `src/App.jsx:987` (`callOpenRouter`).
- Auth: `VITE_OPENROUTER_API_KEY` env var or runtime-entered key persisted to `localStorage`.
## Data Flow
### Primary Request Path — User opens the app
### Authentication flow
### Email analysis flow (AI)
### Document scan flow
## State Management
- **No external store** — no Redux, Zustand, Context, or React Query.
- All state lives inside `App` as `useState` hooks (~40+ hooks declared between `src/App.jsx:652-749`).
- Cross-cutting concerns handled with `useEffect`:
- Persistence model: every mutation calls the API (`fetch('/api/...')`) AND updates local React state optimistically.
- `localStorage` is used both as a session cache and for: `family_jwt_token`, `openrouter_api_key`, `analysisResults`, `renewalPlans`, `renewalStepsProgress`, `completedActionIds`, `customScannedActions`.
## Routing
- **No client-side router.** No `react-router-dom` dependency. Navigation is driven by `activeTab` state with three values: `'documents'`, `'inbox'`, `'actions'`. (`src/App.jsx:652,2204,2414,2531`)
- Unauthenticated state renders `<Lockscreen/>` instead of the dashboard — gated on `token`/`user` state. (`src/App.jsx:662-663`)
- Server has no URL routing beyond explicit Express routes; all non-`/api` paths fall through to `express.static('dist')`. (`server/server.js:409`)
## Key Abstractions
- Purpose: Controls which of three views renders inside `App`.
- Values: `'documents' | 'inbox' | 'actions'`.
- Examples: `src/App.jsx:652`, switching at lines `1223, 1880, 1888, 2204, 2414, 2531, 2766, 2787`.
- Purpose: Fixed POC "now" for deterministic expiry/urgency math.
- Value: `'2026-05-19'`.
- Used both client-side (`src/App.jsx:7`) and server-side (`server/server.js:122,162`).
- Purpose: Avoid callback hell in route handlers; expose `get`, `all`, `run`, `exec`.
- Location: `server/db.js:19-55`.
- Purpose: Decode JWT and bind `{ id, email, family_name }` to `req.user`.
- Location: `server/middleware.js:5`.
## Entry Points
- Location: `src/main.jsx`
- Triggers: `<script type="module" src="/src/main.jsx">` in `index.html`.
- Responsibilities: Create React root, render `<StrictMode><App/></StrictMode>`.
- Location: `server/server.js`
- Triggers: `npm run server` or `npm run dev` (via `concurrently`).
- Responsibilities: Configure middleware (CORS, JSON 10 MB), declare all `/api/*` routes, serve `dist/`, listen on `PORT` (default `5000`).
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
### Mock data living inside production code
### Default secrets in source
### Client-held third-party API key
## Error Handling
- Server returns `{ error: '<message>' }` with appropriate 4xx/5xx status.
- Client logs errors and shows ephemeral notifications, but does not block the UI; many failures are silent.
- No central error boundary — a thrown render error will unmount the entire app.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
