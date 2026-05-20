# Technology Stack

**Analysis Date:** 2026-05-20

## Languages

**Primary:**
- JavaScript (ESM, `"type": "module"` in `package.json`) - Both frontend (React JSX) and backend (Node.js Express)
- JSX - React component syntax used in `src/App.jsx`, `src/main.jsx`

**Secondary:**
- HTML - Single entry document `index.html`
- CSS - `src/index.css`, `src/App.css` (Tailwind v4 driven)
- SQL - Embedded schema in `server/db.js` (SQLite DDL)

## Runtime

**Environment:**
- Node.js (ESM) - Runs both Express server (`server/server.js`) and Vite dev server
- Browser runtime - React 19 SPA

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`, 163KB)

## Frameworks

**Core:**
- React `^19.2.6` - UI framework (`src/App.jsx`, `src/main.jsx`)
- React DOM `^19.2.6` - DOM rendering, `createRoot` API
- Express `^5.2.1` - Backend HTTP server (`server/server.js`)

**Testing:**
- Not detected - No test framework configured, no test files present

**Build/Dev:**
- Vite `^8.0.12` - Frontend build tool and dev server (`vite.config.js`)
- `@vitejs/plugin-react` `^6.0.1` - React plugin for Vite (Oxc-based)
- `@tailwindcss/vite` `^4.3.0` - Tailwind v4 Vite plugin
- `concurrently` `^9.2.1` - Runs Vite + Express together via `npm run dev`
- PostCSS `^8.5.15` - CSS processing
- Autoprefixer `^10.5.0` - Vendor prefix injection

## Key Dependencies

**Critical (Backend):**
- `express` `^5.2.1` - REST API server framework
- `sqlite3` `^6.0.1` - Embedded SQL database driver (`server/db.js`, persisted to `server/database.db`)
- `jsonwebtoken` `^9.0.3` - JWT auth token sign/verify (`server/server.js`, `server/middleware.js`)
- `bcryptjs` `^3.0.3` - Password hashing (salt rounds = 10) in `server/server.js`
- `cors` `^2.8.6` - Cross-origin middleware enabled globally

**Critical (Frontend):**
- `react` / `react-dom` `^19.2.6` - SPA shell
- `tailwindcss` `^4.3.0` - Utility-first CSS (configured via Vite plugin, no separate config file)

**Dev Tooling:**
- `eslint` `^10.3.0` - Linter
- `@eslint/js` `^10.0.1` - JS recommended rules
- `eslint-plugin-react-hooks` `^7.1.1` - React hooks lint rules
- `eslint-plugin-react-refresh` `^0.5.2` - HMR-safe component checks
- `globals` `^17.6.0` - Browser global definitions
- `@types/react` `^19.2.14`, `@types/react-dom` `^19.2.3` - Type stubs (no TS source in repo)

## Configuration

**Environment:**
- `.env` file present at project root (loaded by Vite for `VITE_*` vars)
- Server reads `process.env.PORT` and `process.env.JWT_SECRET` directly (no dotenv import detected — relies on shell env)
- Frontend reads `import.meta.env.VITE_*` via Vite's env injection
- JWT secret has insecure fallback default `'family-ai-secret-key-2026'` in `server/server.js:10` and `server/middleware.js:3`

**Build:**
- `vite.config.js` - Vite config (React + Tailwind plugins, dev proxy `/api` → `http://localhost:5000`)
- `eslint.config.js` - Flat ESLint config
- `index.html` - Vite HTML entry (loads `/src/main.jsx` as module)
- No `tsconfig.json` (project is plain JS/JSX)
- No `postcss.config.*` (Tailwind v4 handles via Vite plugin)
- No `tailwind.config.*` (Tailwind v4 zero-config)

## Platform Requirements

**Development:**
- Node.js with ESM support (Node 18+ recommended for Express 5 / Vite 8)
- npm
- Two ports: `5173` (Vite dev) and `5000` (Express API)
- Run: `npm run dev` (uses `concurrently` to start both)

**Production:**
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

---

*Stack analysis: 2026-05-20*
