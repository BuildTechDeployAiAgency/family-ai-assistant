# Codebase Structure

**Analysis Date:** 2026-05-20

## Directory Layout

```
family-ai-assistant/
├── index.html                  # HTML shell; mounts React at #root, loads /src/main.jsx
├── vite.config.js              # Vite config: React plugin, Tailwind v4 plugin, /api proxy → :5000
├── eslint.config.js            # Flat ESLint config (React Hooks + React Refresh rules)
├── package.json                # Scripts (dev/build/server/lint/preview) and deps
├── package-lock.json           # npm lockfile
├── README.md                   # Project readme
├── .env                        # VITE_OPENROUTER_API_KEY, VITE_OPENROUTER_MODEL (NOT read by tools)
├── .gitignore                  # Standard ignores
│
├── src/                        # React 19 frontend (Vite-bundled)
│   ├── main.jsx                # Entry — createRoot + <StrictMode><App/></StrictMode>
│   ├── App.jsx                 # ~3,643-line single-component SPA (all tabs, modals, logic, Lockscreen)
│   ├── App.css                 # Component-scoped styles (legacy Vite template defaults)
│   ├── index.css               # Global styles, Tailwind v4 imports, custom design tokens
│   └── assets/                 # Static images imported by the bundler
│       ├── hero.png            # Onboarding/hero illustration
│       ├── react.svg           # Default Vite template asset
│       └── vite.svg            # Default Vite template asset
│
├── server/                     # Node + Express + SQLite backend
│   ├── server.js               # Express app: /api/auth, /api/documents, /api/emails, /api/tasks; serves dist/
│   ├── db.js                   # sqlite3 connection + Promise-wrapped query helpers + schema bootstrap
│   ├── middleware.js           # JWT bearer-token authenticateToken middleware
│   └── database.db             # SQLite file (binary, auto-created on first boot)
│
├── public/                     # Static files served verbatim by Vite
│   ├── favicon.svg             # Site icon
│   └── icons.svg               # SVG sprite (if referenced by UI)
│
├── dist/                       # Vite build output (gitignored typically); Express serves this in prod
│
├── .planning/                  # GSD planning artifacts (this folder)
│   └── codebase/               # Codebase map docs (STACK / ARCHITECTURE / STRUCTURE / etc.)
│
├── .chrome-profile/            # Local Chrome profile (likely Playwright/automation scratch — ignore)
└── node_modules/               # Dependencies
```

## Directory Purposes

**`src/`**
- Purpose: All frontend code (React 19 + Tailwind v4) compiled by Vite.
- Contains: One React app file, two CSS files, an assets folder.
- Key files: `src/main.jsx` (entry), `src/App.jsx` (everything else).

**`server/`**
- Purpose: Express HTTP API + SQLite persistence.
- Contains: Route handlers, DB layer, JWT middleware, SQLite database file.
- Key files: `server/server.js` (routes), `server/db.js` (schema + helpers), `server/middleware.js` (auth).

**`public/`**
- Purpose: Static assets copied to the build root by Vite (no import statement required).
- Contains: Favicon and shared SVG icons.

**`dist/`**
- Purpose: Vite production build output.
- Generated: Yes (`npm run build`).
- Committed: No (typically; check `.gitignore`).
- Served by: `express.static('dist')` in `server/server.js:409`.

**`.planning/codebase/`**
- Purpose: GSD `/gsd:map-codebase` outputs — STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, etc.
- Generated: Yes (by the codebase-mapper agent).

**`.chrome-profile/`**
- Purpose: Persistent Chromium user-data directory (presumably for local browser automation or auth state during demos). Not part of runtime.

## Key File Locations

**Entry Points:**
- `index.html`: HTML shell, loads the React bundle.
- `src/main.jsx`: React root mount.
- `server/server.js`: Express app boot + `app.listen(PORT)`.

**Configuration:**
- `vite.config.js`: Vite + React + Tailwind v4, `/api` proxy to `localhost:5000`.
- `eslint.config.js`: Flat-config ESLint setup.
- `.env`: `VITE_OPENROUTER_*` for the browser; not auto-loaded by server.
- `package.json`: Scripts, dependency versions.

**Core Logic:**
- `src/App.jsx`: Entire SPA — state, fetch calls, AI orchestration, document/email/task UI, Lockscreen.
- `server/server.js`: All API endpoints (auth + documents + emails + tasks + static).
- `server/db.js`: Schema definition (`users`, `documents`, `emails`, `tasks`) and Promise DB helpers.
- `server/middleware.js`: JWT verification.

**Testing:**
- No test directory. No `*.test.*` or `*.spec.*` files. No test runner installed.

## Naming Conventions

**Files:**
- React components: `PascalCase.jsx` (only `App.jsx` exists today).
- Server modules: `lowercase.js` (`server.js`, `db.js`, `middleware.js`).
- Styles: lowercase `.css`.

**Directories:**
- Top-level: lowercase, single word (`src`, `server`, `public`, `dist`).

## Where to Add New Code

**New API endpoint:**
- Add the handler to `server/server.js` in the appropriate section (Authentication / Documents / Emails / Tasks), or open a new section.
- Use the `query` helpers from `server/db.js` and the `authenticateToken` middleware from `server/middleware.js`.
- If a new entity is introduced, add its `CREATE TABLE IF NOT EXISTS` to `initializeSchema` in `server/db.js`.

**New React UI:**
- Today: extend `src/App.jsx` (existing pattern, but discouraged — see CONCERNS).
- Preferred: create `src/components/<Name>.jsx`, import it into `App.jsx`, and progressively extract logic out of `App.jsx`.

**New tab / view:**
- Add the value to the `activeTab` union and render a new branch alongside the existing three checks in `src/App.jsx` (`activeTab === 'documents'`, `'inbox'`, `'actions'`).
- Add a corresponding bottom-nav button in the nav block (`src/App.jsx:2766-2790`).

**Shared utilities / helpers:**
- Today: declared at the top of `src/App.jsx` (e.g., `parseDate` at line 384).
- Preferred: create `src/lib/<name>.js` and import.

**Static images:**
- Imported by bundler: `src/assets/`.
- Served as-is at site root: `public/`.

**Global styles / design tokens:**
- `src/index.css` (Tailwind v4 imports + custom CSS variables).

**Environment variables:**
- Client-side (must be prefixed `VITE_`): add to `.env` at project root.
- Server-side: read directly from `process.env` in `server/server.js` (currently `PORT`, `JWT_SECRET`).

## Special Directories

**`dist/`**
- Generated by `npm run build`.
- Served by Express in production via `express.static('dist')`.
- Should be in `.gitignore`.

**`.chrome-profile/`**
- Persistent Chromium user-data directory used for local browsing/automation scratch. Not part of runtime.
- Should be in `.gitignore`.

**`server/database.db`**
- SQLite file auto-created on first server boot via `initializeSchema` (`server/db.js:57`).
- Committing this file would persist demo data across clones; treat with care.

**`.planning/`**
- GSD planning artifacts (codebase maps, phase plans). Safe to commit.

---

*Structure analysis: 2026-05-20*
