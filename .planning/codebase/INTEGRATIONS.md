# External Integrations

**Analysis Date:** 2026-05-20

## APIs & External Services

**AI / LLM:**
- OpenRouter - LLM gateway used for email scanning, document plan generation, and multimodal image scanning (passport/ID photos)
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions` (`src/App.jsx:987`)
  - SDK/Client: Plain `fetch()` (no SDK package)
  - Auth: Bearer token from `VITE_OPENROUTER_API_KEY` env var or `localStorage.openrouter_api_key`
  - Default model: `google/gemini-3.5-flash` (`src/App.jsx:655, 961`)
  - Usage: `callAI()` orchestration in `src/App.jsx` around lines 959-1010
  - Capabilities used: text completion + multimodal vision (base64 images via `/api/documents` upload path)

**Fonts & Icons (CDN):**
- Google Fonts - Geist font family (loaded via CDN in `index.html:10`)
- Material Symbols Outlined - Icon font (loaded via Google Fonts CDN in `index.html:10`)

## Data Storage

**Databases:**
- SQLite (local file)
  - Connection: Local file at `server/database.db`
  - Client: `sqlite3` `^6.0.1` (Promise-wrapped helpers in `server/db.js`)
  - Schema initialized on boot in `server/db.js:57` (`initializeSchema()`)
  - Tables: `users`, `documents`, `emails`, `tasks` (all FK to `users.id` with `ON DELETE CASCADE`)

**File Storage:**
- Local filesystem only — SQLite DB at `server/database.db`
- Base64 image uploads accepted up to 10MB (`express.json({ limit: '10mb' })` in `server/server.js:13`) but passed straight to OpenRouter, not stored

**Caching:**
- None (server-side)
- Browser `localStorage` used for `openrouter_api_key` and auth `token` (client-side only)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based auth (no third-party provider)
  - Implementation: `server/server.js` (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`) + `server/middleware.js` (`authenticateToken`)
  - Token: signed JWT with 30-day expiry, payload `{ id, email, family_name }`
  - Password hashing: `bcryptjs` with salt rounds = 10
  - Client sends `Authorization: Bearer <token>` header (e.g. `src/App.jsx:835, 863, 871, 879`)
  - Secret: `JWT_SECRET` env var, with insecure fallback default in code (`server/server.js:10`, `server/middleware.js:3`)

## Monitoring & Observability

**Error Tracking:**
- None - Server uses `console.error()`; client uses `console.error()` and in-UI `aiError` / `scannerError` state

**Logs:**
- `console.log` / `console.error` only (stdout/stderr); no structured logging, no log aggregation

## CI/CD & Deployment

**Hosting:**
- Not configured - No deploy config detected (no Vercel, Netlify, Docker, fly.toml, etc.)
- Designed to run as a single Node process serving both API and static bundle from `dist/` (`server/server.js:409`)

**CI Pipeline:**
- None - No `.github/workflows/`, no CI config files present

## Environment Configuration

**Required env vars:**

| Variable | Consumed by | Purpose |
|----------|-------------|---------|
| `VITE_OPENROUTER_API_KEY` | Frontend (`src/App.jsx:654`) | OpenRouter API authentication (Bearer token) |
| `VITE_OPENROUTER_MODEL` | Frontend (`src/App.jsx:655`) | LLM model identifier override (default `google/gemini-3.5-flash`) |
| `PORT` | Backend (`server/server.js:9`) | Express listen port (default 5000) |
| `JWT_SECRET` | Backend (`server/server.js:10`, `server/middleware.js:3`) | JWT signing secret (insecure fallback present) |

**Secrets location:**
- `.env` file at project root (gitignored via `.gitignore`)
- Client-side: API key also persisted in browser `localStorage` under `openrouter_api_key`

**Note:** The `VITE_*` prefix means `VITE_OPENROUTER_API_KEY` is embedded into the frontend bundle at build time and is publicly visible to any user. This is a known constraint of the current client-side LLM call architecture.

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints detected

**Outgoing:**
- None - No outbound webhook calls; only outbound HTTP is to OpenRouter

## Internal API Surface

Express endpoints (all under `/api`, proxied through Vite dev server per `vite.config.js:13`):

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | None | Create user, return JWT |
| POST | `/api/auth/login` | None | Verify credentials, return JWT |
| GET | `/api/auth/me` | JWT | Verify session, return user |
| GET | `/api/documents` | JWT | List user documents |
| POST | `/api/documents` | JWT | Upsert document (INSERT OR REPLACE) |
| DELETE | `/api/documents/:id` | JWT | Delete document |
| GET | `/api/emails` | JWT | List user emails |
| POST | `/api/emails/sync` | JWT | Bulk upsert emails |
| PUT | `/api/emails/:id` | JWT | Update read/processed flags |
| GET | `/api/tasks` | JWT | List user tasks |
| POST | `/api/tasks` | JWT | Upsert task |
| PUT | `/api/tasks/:id` | JWT | Update task |
| DELETE | `/api/tasks/:id` | JWT | Delete task |

---

*Integration audit: 2026-05-20*
