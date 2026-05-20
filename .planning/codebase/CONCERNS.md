# Codebase Concerns

**Analysis Date:** 2026-05-20

## Tech Debt

**Monolithic frontend component:**
- Issue: `src/App.jsx` is 3,643 lines containing all UI, state, AI orchestration, mock data, canvas image generation, and API calls. No component decomposition.
- Files: `src/App.jsx`
- Impact: Unmaintainable, untestable, slow editor performance, high merge-conflict risk, prop drilling impossible to track, every change risks breaking unrelated features.
- Fix approach: Decompose by feature — extract `DocumentsTab`, `EmailsTab`, `ActionsTab`, `RenewalPlan`, `ScannerModal`, `AuthScreen` into `src/components/`. Move mock data (`INITIAL_DOCUMENTS`, `INITIAL_EMAILS`, `MOCK_AI_RESPONSES`, `DEFAULT_RENEWAL_PLANS`) into `src/data/`. Move `callAI`, `cleanAndParseJSON`, `getDocumentStatus` into `src/lib/`. Lift shared state into a context or Zustand store.

**Inline mock data baked into source:**
- Issue: Hundreds of lines of fictional Hassan family data (`INITIAL_DOCUMENTS`, `INITIAL_EMAILS`, `MOCK_AI_RESPONSES`, `DEFAULT_RENEWAL_PLANS`) live inside `App.jsx` and are auto-seeded for every new user.
- Files: `src/App.jsx` lines 17-378
- Impact: New real users get fake "Hassan family" documents and emails inserted into their account on first login. Bundle bloat. Cannot ship to real users.
- Fix approach: Move to `src/data/seed.js` behind a `VITE_SEED_DEMO_DATA` flag; default off in production. Or gate seeding behind a "Load demo data" button.

**Monolithic Express server:**
- Issue: All routes (auth, documents, emails, tasks) and a hardcoded `REFERENCE_DATE = '2026-05-19'` business-logic constant live in a single `server/server.js`.
- Files: `server/server.js` (414 lines)
- Impact: No route separation, status-computation logic duplicated between server and client, hardcoded date will silently break expiry calculations as time passes.
- Fix approach: Split into `server/routes/auth.js`, `routes/documents.js`, `routes/emails.js`, `routes/tasks.js`. Replace `REFERENCE_DATE` constant with `new Date()` or pull from a single config.

**Dual persistence (localStorage + SQLite) with manual sync:**
- Issue: All major state is mirrored to localStorage AND POSTed to the API. Migration logic in `syncInitialData` (`src/App.jsx:759-822`) blindly re-POSTs every local doc/email/task on first login.
- Files: `src/App.jsx:667-949`
- Impact: Data conflicts between devices, stale localStorage overwrites server state, double-writes, race conditions on the initial load `useEffect`.
- Fix approach: Pick one source of truth — server when authenticated, localStorage only as anonymous-mode fallback. Remove the blanket migration loop or guard it with an explicit user opt-in.

**Hardcoded `REFERENCE_DATE` constant:**
- Issue: `const REFERENCE_DATE = '2026-05-19'` appears in three places (`src/App.jsx:7`, `server/server.js:122`, `server/server.js:162`) to compute document expiry status.
- Impact: As the real date drifts past this constant, "Expired" / "Expiring" / "Valid" status will be wrong. Logic is duplicated.
- Fix approach: Use `new Date().toISOString().slice(0,10)` in a single helper module imported by both client and server.

**Sync task seeding hack:**
- Issue: `syncInitialData` (`src/App.jsx:798-818`) POSTs fake "Sync Task" rows for every completed-action ID just to record completion state.
- Impact: Pollutes the `tasks` table with placeholder rows ("title: 'Sync Task', assignee: 'Family', category: 'Sync'") that aren't real tasks.
- Fix approach: Add a dedicated `completed_actions` table or a boolean column rather than fabricating task rows.

## Known Bugs

**Wrong default LLM model:**
- Symptoms: Default model is `google/gemini-3.5-flash` (`src/App.jsx:655, 961`), which is not a real OpenRouter model identifier (no such Gemini 3.5 exists — likely meant `google/gemini-2.0-flash` or `google/gemini-2.5-flash`).
- Files: `src/App.jsx:655`, `src/App.jsx:961`
- Trigger: Any AI call without an explicit `VITE_OPENROUTER_MODEL` env override.
- Workaround: Set `VITE_OPENROUTER_MODEL` in `.env` to a real model slug.

**Server date hardcoded in business logic:**
- Symptoms: Document `status` and `progress` are computed against `'2026-05-19'`. Once real time passes that date significantly, documents wrongly stay "Valid" or never expire correctly.
- Files: `server/server.js:122`, `server/server.js:162`
- Trigger: Any GET/POST to `/api/documents` after the hardcoded date passes.
- Workaround: None — must edit source.

**Token leak via verifyToken removal:**
- Symptoms: When token verification fails on startup, `localStorage.removeItem('family_jwt_token')` runs, but other `family_*` localStorage keys (documents, emails, analysis_results) remain — they leak from previous users on shared devices.
- Files: `src/App.jsx:843-852`
- Workaround: Add a logout/clear-all helper that wipes the whole `family_*` namespace.

## Security Considerations

**Hardcoded JWT secret with weak fallback:**
- Risk: `JWT_SECRET` defaults to literal string `'family-ai-secret-key-2026'` in both `server/server.js:10` and `server/middleware.js:3`. If the `.env` variable is missing or the app is deployed without it, tokens are signable by anyone reading the public source.
- Files: `server/server.js:10`, `server/middleware.js:3`
- Current mitigation: `.env` file exists locally and presumably defines `JWT_SECRET`.
- Recommendations: Remove the fallback. Throw on startup if `JWT_SECRET` is unset. Use a 32+ byte random secret. Rotate keys on a schedule.

**`.env` not in `.gitignore`:**
- Risk: `.env` exists in the repo root but `.gitignore` does not list `.env`, `.env.*`, or `*.env`. Any developer running `git add .` could commit secrets (OpenRouter API key, JWT secret) to the repo.
- Files: `.gitignore`, `.env`
- Current mitigation: None.
- Recommendations: Add `.env`, `.env.local`, `.env.*.local` to `.gitignore` immediately. Audit git history with `git log --all -- .env` to confirm no prior commits leaked secrets. Rotate any keys that were ever in `.env`.

**SQLite database file committed to working tree:**
- Risk: `server/database.db` exists in the project folder. Not in `.gitignore`. Contains real user emails, hashed passwords, document numbers (passport numbers, driving licence numbers).
- Files: `server/database.db`, `.gitignore`
- Recommendations: Add `*.db`, `server/database.db` to `.gitignore`. Verify it has not already been committed (`git log --all -- server/database.db`). If it has, rewrite history and rotate any leaked credentials.

**`dist/` build artifacts present but `.gitignore` covers `dist`:**
- Note: `dist/` is in `.gitignore` so this is fine, but the directory exists on disk and may contain stale builds embedding old env vars (incl. `VITE_OPENROUTER_API_KEY` baked into the bundle).
- Recommendations: Clean `dist/` before publishing. Never commit bundles.

**OpenRouter API key exposed to browser:**
- Risk: `VITE_OPENROUTER_API_KEY` is read in client code (`src/App.jsx:654`) and used in direct `fetch('https://openrouter.ai/...')` calls from the browser. Vite inlines `VITE_*` vars into the public bundle — anyone with the deployed JS can extract and reuse the key.
- Files: `src/App.jsx:654`, `src/App.jsx:987-1000`
- Current mitigation: User can also paste their own key into `localStorage`, but the default still ships embedded.
- Recommendations: Move all OpenRouter calls server-side. Add a `POST /api/ai/analyze` Express route that owns the key. Never ship LLM keys to the browser.

**No rate limiting on auth endpoints:**
- Risk: `/api/auth/login` and `/api/auth/register` accept unlimited requests. Brute-force password guessing and account-enumeration are trivial.
- Files: `server/server.js:20-98`
- Current mitigation: bcrypt with 10 salt rounds slows guessing per-attempt.
- Recommendations: Add `express-rate-limit` (e.g. 5 attempts / 15 minutes / IP on `/login`, 3 registrations / hour / IP). Consider login lockouts.

**CORS wide open:**
- Risk: `app.use(cors())` (`server/server.js:12`) accepts all origins with credentials. Any malicious site can hit the API once a user is logged in.
- Files: `server/server.js:12`
- Recommendations: Configure `cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true })`.

**No input validation library:**
- Risk: Request bodies are checked only with `if (!field)` truthiness gates. No type/length/format validation on email, password, document fields. SQL injection is prevented by parameterized queries, but garbage / oversized payloads pass through (e.g. 9.5MB base64 image strings into the `notes` field).
- Files: `server/server.js` throughout
- Recommendations: Add `zod` or `express-validator`. Enforce email format, min password length (current code allows any non-empty string), max field lengths matching SQLite column expectations.

**`express.json({ limit: '10mb' })`:**
- Risk: 10 MB JSON body limit per request. With no auth on the body parser and no rate limit, a malicious client can flood with large payloads (memory/CPU DoS).
- Files: `server/server.js:13`
- Recommendations: Drop to 100 KB for JSON. Add a separate multipart or signed-URL upload path for any actual binary content (images currently flow base64 through chat completions, not through this endpoint, so 10 MB is unjustified here).

**No HTTPS enforcement / security headers:**
- Risk: No `helmet`, no HSTS, no CSP, no `X-Content-Type-Options`. Tokens travel via plain `Authorization` header.
- Files: `server/server.js`
- Recommendations: Add `helmet()` middleware. Enforce HTTPS in production. Set `Strict-Transport-Security`, `X-Frame-Options`, basic CSP.

**JWT stored in localStorage:**
- Risk: `family_jwt_token` is stored in `localStorage` (`src/App.jsx:662, 827`). Any XSS in this app exfiltrates the token; 30-day expiry means long-lived theft.
- Files: `src/App.jsx:662, 827, 843, 849`
- Recommendations: Move to `httpOnly` cookie set by the server. Shorten expiry to a few hours and refresh.

**No password strength requirements:**
- Risk: `register` accepts any non-empty password.
- Files: `server/server.js:23-25`
- Recommendations: Enforce min length (12), encourage passphrases. Optionally check breached-password lists.

**Generic error messages leak nothing — good — but stack traces are logged to stdout:**
- Note: `console.error` calls are fine, but in production these should go to a structured logger (e.g. pino) with PII redaction.

## Performance Bottlenecks

**Single 3,643-line React component:**
- Problem: Every state update in any feature re-renders the entire tree.
- Files: `src/App.jsx`
- Cause: One mega-component, no `React.memo`, no context boundaries.
- Improvement path: Split into smaller components, memoize lists (`documents.map`, `emails.map`).

**Sequential POST loop in `syncInitialData`:**
- Problem: Each document / task is POSTed one at a time with `await fetch(...)` in a `for` loop (`src/App.jsx:762-771, 785-794, 801-818`). With 10 initial documents + 15 emails (synced via one bulk call) + N tasks, this serially fires dozens of HTTP requests.
- Files: `src/App.jsx:759-822`
- Cause: No bulk endpoint for documents/tasks (only `/api/emails/sync` is bulk).
- Improvement path: Add `POST /api/documents/sync` and `POST /api/tasks/sync` that take arrays and run a single transaction.

**Sequential `INSERT OR REPLACE` in `/api/emails/sync`:**
- Problem: Server runs `await query.run(...)` inside a `for` loop (`server/server.js:256-273`) — N round-trips to SQLite, no transaction.
- Files: `server/server.js:247-280`
- Cause: No `BEGIN TRANSACTION ... COMMIT` wrap.
- Improvement path: Wrap the loop in a transaction; SQLite will commit all rows atomically and ~10x faster.

**SQLite without indexes on `user_id`:**
- Problem: Every list query (`SELECT * FROM documents WHERE user_id = ?`, same for emails/tasks) does a full table scan as user count grows.
- Files: `server/db.js:67-107`
- Improvement path: `CREATE INDEX idx_documents_user ON documents(user_id);` (and emails, tasks). Add to the schema init block.

## Fragile Areas

**Initial-data seeding `useEffect`:**
- Files: `src/App.jsx:858-924`
- Why fragile: Detects "empty profile" with `if (docs.length === 0 && ems.length === 0)` and then seeds Hassan family mock data into the user's account. Any user who legitimately deletes all their docs+emails will get the mock data re-injected on next login.
- Safe modification: Guard with an explicit `users.seeded_at` column or `localStorage.first_login_complete` flag.
- Test coverage: None.

**`callAI` JSON parsing:**
- Files: `src/App.jsx:1012-1023, 1065`
- Why fragile: Relies on `cleanAndParseJSON` heuristic strip of ```json``` fences. If the model returns prose, returns valid JSON wrapped differently, or returns truncated JSON (1500 max_tokens), `JSON.parse` throws and `setAiError` shows a raw exception.
- Safe modification: Use OpenRouter `response_format: { type: 'json_object' }`. Catch parse errors gracefully and retry once.
- Test coverage: None.

**Auth `useEffect` dependency on `user`:**
- Files: `src/App.jsx:858-924`
- Why fragile: Triggers on `[token, user]`. `setUser` runs after `setToken` in `verifyToken`, causing two renders and potentially two seed attempts.
- Safe modification: Use a single state object `{ token, user, status }` or guard with an `isSeeding` ref.

## Scaling Limits

**SQLite single-file database:**
- Current capacity: Fine for tens of users on one node.
- Limit: Concurrent writes serialize; no horizontal scaling; backup = file copy.
- Scaling path: Move to Postgres / Supabase when multi-user / concurrent writes become real.

**No connection pooling, no graceful shutdown:**
- Current state: `sqlite3.Database` opened once at startup, never closed.
- Limit: On crash, in-flight writes may corrupt the file (WAL helps, not configured).
- Scaling path: Enable WAL mode (`PRAGMA journal_mode=WAL`). Add `SIGTERM` handler that closes the DB.

## Dependencies at Risk

**Bleeding-edge / suspicious versions in `package.json`:**
- `react ^19.2.6` and `react-dom ^19.2.6` — React 19 is recent; minor releases this high may not exist yet — verify against npm registry.
- `express ^5.2.1` — Express 5 GA is real but recent; some middleware ecosystems still target v4.
- `eslint ^10.3.0` — ESLint 10 is bleeding-edge; many plugins not yet compatible.
- `vite ^8.0.12` — verify; current stable is much lower historically.
- `sqlite3 ^6.0.1` — current `sqlite3` major is around 5.x; verify this version exists or switch to `better-sqlite3` (synchronous, faster, simpler API).
- `tailwindcss ^4.3.0` + `@tailwindcss/vite ^4.3.0` — Tailwind v4 is new and has breaking config changes vs v3.

Impact: `npm install` may pull versions that don't exist or have incompatibilities; CI/CD may break unpredictably. Lockfile (`package-lock.json`) exists but the declared ranges allow drift.

Recommendation: Pin exact versions (`"react": "19.2.6"` without `^`), audit each package against the registry, and consider downgrading to LTS-stable versions until the app is more mature.

**No `npm audit` / dependency scanning:**
- No `dependabot.yml`, no Renovate config, no Snyk integration.
- Recommendation: Enable GitHub Dependabot or Renovate.

## Missing Critical Features

**No logout endpoint / logout UI verification:**
- Problem: No `/api/auth/logout` route. Server has no token invalidation — JWTs live 30 days regardless of "logout".
- Blocks: Real session revocation, stolen-token mitigation.
- Fix: Implement a token blacklist table or shorten lifetime + refresh tokens.

**No password reset flow:**
- Problem: No "forgot password" endpoint or email integration.
- Blocks: Anyone forgetting their password is locked out forever.

**No email verification:**
- Problem: `POST /api/auth/register` accepts any string in `email`. No verification email sent.
- Blocks: Account squatting on someone else's email; spam registrations.

**No HTTPS / production config:**
- Problem: `app.listen(PORT)` only, no TLS, no `trust proxy`.
- Blocks: Safe production deployment.

**No structured error handling middleware:**
- Problem: Every route has its own try/catch with `console.error` + 500 JSON. No central error handler, no error IDs.
- Fix: Add Express error-handling middleware `(err, req, res, next) => ...`.

**No request logging:**
- Problem: No `morgan` or equivalent. Operators can't see who called what.
- Fix: Add `morgan('combined')` or pino-http.

## Test Coverage Gaps

**Zero tests:**
- What's not tested: Everything. No `*.test.*`, no `*.spec.*` files. No test runner declared in `package.json` (no Vitest, Jest, Playwright). No CI configuration files.
- Files: entire codebase
- Risk: Any refactor risks silent regression. Auth bugs (e.g. one-user-can-read-another's-data) cannot be caught automatically.
- Priority: **High** — at minimum, add integration tests for the auth + documents endpoints proving the `user_id` scoping works (it currently does, but is fragile).

**Specifically missing:**
- Auth flow tests (register → login → me → logout)
- Document CRUD authorization tests (User A cannot read/delete User B's docs)
- Date/status calculation tests (would have caught the `REFERENCE_DATE` issue)
- AI JSON parsing tests (`cleanAndParseJSON` is a single function easy to unit-test)
- React component tests for the main tabs

## Missing Documentation

- `README.md` is 1 KB — not inspected here but should cover setup, env vars, architecture.
- No `docs/` folder. No API documentation (no OpenAPI / Swagger).
- No `.env.example` template — new developers cannot tell which env vars are required (`JWT_SECRET`, `PORT`, `VITE_OPENROUTER_API_KEY`, `VITE_OPENROUTER_MODEL`).
- Recommendation: Add `.env.example` with all required vars and dummy values.

## TODO / FIXME / HACK / XXX

None found in `src/` or `server/`. (Codebase is brownfield but has no comment markers — concerns are structural, not annotated.)

## Dead Code / Unused Artifacts

- `.chrome-profile/` — large checked-in Chrome user-data directory in the project root. Should be deleted and added to `.gitignore`. Unclear why it exists.
- `dist/` — present on disk, gitignored, fine.
- `node_modules/` — gitignored, fine.

---

*Concerns audit: 2026-05-20*
