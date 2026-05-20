# Coding Conventions

**Analysis Date:** 2026-05-20

## Naming Patterns

**Files:**
- React entry/components: PascalCase `.jsx` — `src/App.jsx`, `src/main.jsx`
- Stylesheets: lowercase paired with component name — `src/App.css`, `src/index.css`
- Server modules: lowercase `.js` — `server/server.js`, `server/db.js`, `server/middleware.js`
- Config: lowercase with dots — `eslint.config.js`, `vite.config.js`
- No `src/components/` subdirectory exists — all UI lives in the monolithic `src/App.jsx`

**Functions:**
- Event handlers: `handleX` prefix — `handleSaveSettings`, `handleAddDocument` (`src/App.jsx:1438`, `1446`)
- Utility/helpers: camelCase verbs — `generateMockDocumentImage` (`src/App.jsx:401`), `getDaysDifference` (`src/App.jsx:1452`)
- Server middleware exports: camelCase — `authenticateToken` (`server/middleware.js:5`)

**Variables:**
- camelCase for locals and state — `tempKey`, `apiKey`, `scannerLoading`, `newDocData`
- React state setters paired via `useState` destructuring — `[apiKey, setApiKey]`
- SCREAMING_SNAKE_CASE for module-level constants — `REFERENCE_DATE`, `FAMILY_MEMBERS`, `INITIAL_DOCUMENTS`, `INITIAL_EMAILS` (`src/App.jsx:7-30`), `JWT_SECRET`, `PORT` (`server/server.js:9-10`)

**Types:**
- Plain JavaScript only. No TypeScript, no JSDoc type annotations. `@types/react` and `@types/react-dom` are installed as devDependencies but only support editor tooling.

**Database columns:**
- snake_case in SQLite — `user_id`, `family_name`, `expiry_date`, `password_hash`, `document_number`, `has_attachment`
- Server explicitly maps snake_case DB columns to camelCase JSON for the React client (`server/server.js:121-140`, `230-237`)

## Code Style

**Formatting:**
- No Prettier config, no `.editorconfig`. Formatting is conventional but not enforced by tooling.
- Indentation: 2 spaces throughout.
- Quotes: single quotes preferred (`'react'`, `'family-ai-secret-key-2026'`). Double quotes appear sporadically in `console.error` strings.
- Semicolons: **inconsistent**. Server code uses semicolons consistently. `src/App.jsx` and `src/main.jsx` omit trailing semicolons (modern JS-no-semi style). Do not "fix" one to match the other — match the file you are editing.
- Trailing commas: used in multi-line object/array literals.

**Linting:**
- ESLint 10 flat config at `eslint.config.js`
- Extends: `@eslint/js` recommended, `eslint-plugin-react-hooks` flat recommended, `eslint-plugin-react-refresh` vite config
- Targets: `**/*.{js,jsx}`
- Globals: `globals.browser` (note: this also applies to `server/*.js`, which actually runs in Node — Node globals like `process` are not declared but ESLint does not flag them because they are used as identifiers that exist via the browser/Node overlap or are simply tolerated)
- Ignored: `dist`
- Run: `npm run lint` (executes `eslint .` from project root)

**No rules customised** beyond the extended presets. React hooks rules and react-refresh component export rules apply.

## Import Organization

**Order observed (top of every file):**
1. Third-party packages (`react`, `express`, `cors`, `bcryptjs`, `jsonwebtoken`)
2. Local modules with relative paths (`./db.js`, `./middleware.js`, `./App.jsx`)
3. CSS side-effect imports last (`import './index.css'` in `src/main.jsx:3`)

**Module system:**
- ESM throughout. `package.json` declares `"type": "module"`. Both client and server use `import`/`export`.
- Relative imports include the file extension (`./db.js`, `./App.jsx`) — required because of `"type": "module"`.

**Path Aliases:**
- None configured. All imports use relative paths or bare package names.

## Error Handling

**Server (`server/server.js`):**
- Every endpoint wraps DB work in `try { ... } catch (err) { console.error(...); res.status(500).json({ error: '...' }); }`
- Validation errors return `400` with `{ error: '...' }`. Auth failures return `401`/`403`. Missing rows return `404`.
- Error message strings are human-readable, never raw exception text.

**Client (`src/App.jsx`):**
- Fetch calls use `.catch(err => console.error("Error ... to SQLite:", err))` — failures are logged but **not surfaced to the UI**. Local React state is updated optimistically regardless of server outcome.
- AI/scanner flows use `try/catch/finally` and write user-visible errors into a `scannerError` state string (`src/App.jsx:1428-1434`).
- Input validation in handlers uses `alert(...)` for required-field checks (`src/App.jsx:1449`).

## Logging

**Framework:** `console` only — no logger library on either side.

**Patterns:**
- Server: `console.error('<Action> error:', err)` on every catch. `console.log('Server is running on port ${PORT}')` on boot.
- Client: `console.error(...)` for fetch failures, no `console.log` left in production paths (some remain inside scan flow).

## Comments

**When to Comment:**
- Block headers separate logical sections — server uses `// ---` banner comments between endpoint groups (`server/server.js:15-17`, `112-114`, `220-222`); client uses `// ===` banner comments (`src/App.jsx:3-5`).
- Inline single-line `//` comments explain non-obvious mappings (e.g., `// Map read / has_attachment / processed from 0/1 back to boolean for React`, `server/server.js:229`).
- No JSDoc / TSDoc anywhere in the codebase.

## Function Design

**Size:**
- Server route handlers: 15–60 lines, one handler per route, registered inline on `app`.
- Client: `src/App.jsx` is a **3,643-line single-component file** containing all state, handlers, and JSX. Helper functions (`generateMockDocumentImage`, `getDaysDifference`) are module-level. Event handlers are defined inside the `App` component body.

**Parameters:**
- Destructuring from `req.body` / `req.params` is the standard server pattern (`const { id, title, ... } = req.body`).
- Client handlers accept either `event` or no arguments; data comes from closed-over state.

**Return Values:**
- Server: always `res.json(...)` or `res.status(N).json({ error })`. No raw responses.
- Client: handlers are side-effect only (call `setState`, `fetch`, `setNotification`) — they do not return values.

## Module Design

**Exports:**
- Server modules use named exports (`export const authenticateToken`, `export const query`).
- Client uses default export for the React component (`export default App`).

**Barrel Files:**
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

---

*Convention analysis: 2026-05-20*
