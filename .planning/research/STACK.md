# Technology Stack — Additive Research

**Project:** Family AI Assistant (single-family POC)
**Researched:** 2026-05-20
**Scope:** ADDITIVE only — libraries to add for Drive watcher, Telegram bot, OCR/extraction, scheduling, server-side LLM proxy, security hardening, Fly.io SQLite hosting.

---

## Existing Stack (Constraint — DO NOT Re-Research)

These are locked-in for the POC milestone and feed every additive decision:

| Layer | Tech | Notes |
|---|---|---|
| Frontend | Vite 8 + React 19 SPA | Monolithic 3,643-line `src/App.jsx` (decomposition is a separate concern, not stack) |
| Backend | Express 5 (ESM) | Flat routing in `server/server.js`, must coexist with new routes |
| DB | SQLite via `sqlite3 ^6.0.1` (promise wrappers in `server/db.js`) | Stays SQLite for POC; Postgres deferred to multi-tenant |
| Auth | JWT (jsonwebtoken 9, bcryptjs 3) | 30-day localStorage tokens — Phase 1 to harden, not replace |
| LLM | OpenRouter (client-side currently) | Will move server-side in Phase 1 |
| Hosting (target) | Vercel (FE) + Fly.io (BE) | Decided in PROJECT.md |
| Lang | JavaScript ESM (no TS) | New code stays JS for consistency unless a phase opts in |

Additive choices below must integrate with these without forcing a rewrite.

---

## Recommended Additive Stack

### 1. Google Drive Integration

| Pick | Version | Confidence |
|---|---|---|
| `googleapis` (official SDK) | `^144.x` (latest 2026) | HIGH |
| `google-auth-library` (peer of googleapis) | `^9.x` | HIGH |
| **Polling via `changes.list` + saved `startPageToken`** for POC | — | HIGH |
| Push notifications via `changes.watch` (HTTPS webhook) for v2 | — | MEDIUM |

**Rationale:**
- The official `googleapis` package is the only first-party Node SDK; community wrappers are stale.
- **Polling is the right call for the POC** even though push notifications are more efficient. Reasons:
  - Push requires a publicly reachable HTTPS endpoint with verified domain, a renewable channel (max ~24h–7d TTL), and channel-resubscription cron. Three new failure modes on day one.
  - Polling `changes.list` with a saved `startPageToken` per family is idempotent, easy to reason about, and survives Fly machine restarts.
  - A 60–120s poll interval is invisible to a single family; Drive returns only the delta since the last token, not the whole tree.
- Reserve `changes.watch` (push) for v2 when multi-tenant scale makes 60s polling wasteful. Until then, the operational simplicity wins.
- **Scope each family to a single watched folder** (`'<folderId>' in parents` query) — never the user's whole drive. Privacy + smaller change set.
- **Use OAuth 2.0 with refresh tokens stored in SQLite per family** (column on a new `drive_connections` table). Service accounts won't work — they can't read a personal Drive folder unless explicitly shared, and the UX of "share with this service email" is worse than OAuth.

### 2. Telegram Bot

| Pick | Version | Confidence |
|---|---|---|
| **grammY** | `^1.43.x` (latest stable, May 2026) | HIGH |

**Rationale:**
- Three real options: `grammy`, `telegraf`, `node-telegram-bot-api`. grammY wins.
- **grammY** is the modern, actively maintained pick: clean middleware API, full TypeScript types (free even from JS consumers via JSDoc), `@grammyjs/*` plugin ecosystem (sessions, conversations, runner, files), and works equally well with long polling or webhooks.
- **Telegraf** is still good but its docs regressed to a generated API reference; community momentum is on grammY in 2026.
- **node-telegram-bot-api** is a plain `EventEmitter` — fine for "echo bot" demos, fragments into spaghetti past 50 LOC. Reject.
- **Mode for POC:** `bot.start()` (long polling) on the same Fly machine as Express. Trivial to deploy, no public webhook URL needed.
- **Upgrade path:** swap to webhook mode (`bot.api.setWebhook(...)`, mount as Express middleware) when we move to multi-tenant.
- File handling: `bot.api.getFile()` + `file_path` to download user-forwarded school PDFs/images into the ingestion pipeline.

### 3. Document OCR + LLM Extraction

| Pick | Version | Confidence |
|---|---|---|
| **LLM-native multimodal (OpenRouter → GPT-4o-class or Gemini 2.5 Flash)** as the default path | — | HIGH |
| `pdf-parse` or `pdfjs-dist` for text-extractable PDFs (fast-path) | `pdfjs-dist ^4.x` | HIGH |
| Google Vision API as a fallback for hard scans/photos with poor LLM accuracy | — | MEDIUM |
| **NO Tesseract** | — | HIGH |

**Rationale:**
- We already have OpenRouter wired. **Multimodal LLM is the lowest-friction OCR + extraction path** — one round-trip gives both text and structured fields (category, expiry, child tag).
- Benchmarks (BusinessWareTech 2025, others) show direct GPT-4o vision hits ~90% field accuracy on docs like invoices/passports; the **hybrid Vision-API-then-LLM** approach hits ~98% but needs a second API and extra latency. For a family POC, single-call LLM extraction is plenty — promote to hybrid only if a specific doc type underperforms.
- **Fast-path:** if a PDF has selectable text (most utility bills, insurance docs), extract text with `pdfjs-dist` and skip vision entirely. Cuts cost ~10x.
- **Tesseract is rejected** for this project:
  - Native build pain in Docker on Fly (musl/glibc, Sharp-style nightmares).
  - Layout extraction is weak; you still need an LLM to interpret "expires 14/03/2027" from a passport MRZ or a bill footer.
  - Multilingual extraction (Arabic family names, mixed-script school letters) is much better in modern vLMs.
- Use `response_format: { type: 'json_object' }` on the LLM call — fixes the brittle `cleanAndParseJSON` regex stripping in current `App.jsx`.
- Image preprocessing: `sharp ^0.34.x` to downscale large captures to ≤2048px before sending to the LLM (cost + speed).

### 4. Job Scheduling / Reminder Pipeline

| Pick | Version | Confidence |
|---|---|---|
| **`croner`** for in-process schedule (poll Drive, fire reminders) | `^9.x` | HIGH |
| **No BullMQ, no Redis** for POC | — | HIGH |
| Future: Fly **Cron Manager** for cross-machine isolation if/when needed | — | MEDIUM |

**Rationale:**
- The POC runs on a **single Fly machine** (one process, one SQLite file). In-process scheduling is correct here. The "every instance runs every cron" scaling problem doesn't exist with one instance.
- **Croner** beats `node-cron` and `node-schedule` in 2026:
  - TypeScript-native, handles DST/leap-year edge cases (which matter — "remind me 30 days before passport expires" silently breaks across DST in node-cron).
  - Single dep, no native bindings.
  - Actively maintained vs. `node-cron` (sporadic) and `node-schedule` (effectively stalled).
- **BullMQ + Redis is overkill** for one family:
  - Adds a stateful dependency (Redis) the project doesn't otherwise need.
  - Fly + Upstash Redis = $10–25/mo for one family — wasted spend at POC stage.
  - Retry/durability concerns it solves don't apply: reminders are derived from SQLite rows, recomputable on boot.
- **Pattern:** at boot, `croner` schedules:
  - Every 60s — poll Drive `changes.list` per family
  - Every 5 min — re-scan SQLite for documents whose `expiry_date - now ∈ { 30d, 7d, 1d }` and no reminder sent yet
  - Daily 08:00 family local time — morning Telegram digest
- **Idempotency:** every reminder writes a `reminders_sent` row (`document_id`, `kind`, `sent_at`) so a restart never double-sends.
- **Upgrade trigger:** move to **Fly Cron Manager** when going multi-tenant (it spawns isolated Machines per job; great for fan-out across many families). Not before.

### 5. Server-Side LLM Proxy / Single Router

| Pick | Version | Confidence |
|---|---|---|
| Bespoke Express routes `/api/ai/*` calling OpenRouter via `fetch` (native Node 20+) | — | HIGH |
| `openrouter` SDK or `openai` SDK pointed at OpenRouter base URL | `openai ^4.x` | MEDIUM |
| Prompt management: **plain `.md` files in `server/prompts/` loaded at boot** | — | HIGH |
| **NO LangChain, NO Vercel AI SDK on the server, NO LiteLLM** | — | HIGH |

**Rationale:**
- The existing client-side `callOpenRouter` is a 15-line `fetch`. Move it server-side as-is, gated behind `authenticateToken`. No SDK needed at this scale.
- If team prefers types and streaming helpers, `openai` SDK with `baseURL: 'https://openrouter.ai/api/v1'` works — but it's optional.
- **Prompts as `.md` files** (e.g. `server/prompts/classify-document.md`, `extract-expiry.md`, `route-telegram-message.md`) loaded into memory at boot:
  - Versioned in git, diffable in PRs.
  - No vendor lock-in to a "prompt management platform".
  - Variable interpolation via a 5-line helper (`fill(template, vars)`).
- **The single LLM router** is one Express route (`POST /api/ai/route`) that takes an event envelope `{ source: 'drive' | 'telegram', payload }` and:
  1. Picks a prompt by source + intent classification
  2. Calls OpenRouter with JSON-mode forced
  3. Returns parsed actions; calling code writes them to SQLite
- **Reject LangChain / Vercel AI SDK on the server**: they add abstractions (chains, agents, runnable graphs) for problems we don't have. One-family, fixed prompt set, no tool-calling graph yet.
- **Fix wrong default model**: `google/gemini-3.5-flash` doesn't exist (per CONCERNS). Default to `google/gemini-2.5-flash` or `openai/gpt-4o-mini` and validate the slug against OpenRouter's `/models` at boot.

### 6. Security Hardening

| Pick | Version | Confidence | Replaces / Adds |
|---|---|---|---|
| `helmet` | `^8.x` | HIGH | Sets standard security headers; adds CSP scaffold |
| `express-rate-limit` | `^8.5.x` (latest May 2026) | HIGH | Brute-force protection on `/api/auth/*` |
| `zod` | `^4.x` | HIGH | Replace ad-hoc `if (!field)` validation |
| `cors` (already installed) — **reconfigure**, don't replace | — | HIGH | Lock to `process.env.ALLOWED_ORIGIN` |
| `dotenv` (native preload `node --env-file=.env`) | Node 20.6+ built-in | HIGH | Replace any future need for `dotenv` lib |
| `envalid` for env validation at boot | `^8.x` | MEDIUM | Throws if `JWT_SECRET`, `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_*` missing |
| `pino` + `pino-http` for structured logging | `pino ^9.x`, `pino-http ^10.x` | HIGH | Replace `console.log/error` everywhere |

**Why these specifically:**
- **`helmet`** — drop-in single middleware; we'll start with defaults and tighten CSP after the bundle is built (Vite hashes assets, so `script-src 'self'` with a nonce is feasible).
- **`express-rate-limit` 8.x** is current; pair with `rate-limit-redis` IF we ever add Redis (not for POC). For one Fly machine, the default in-memory store is fine.
- **`zod` over `express-validator`/`joi`** — `zod` schemas double as TypeScript-typed contracts (useful even without TS via `.parse()` runtime checks) and dovetail with `response_format` JSON-schema generation for OpenRouter prompts. `joi` is fine but heavier; `express-validator` is more verbose.
- **`envalid` over `dotenv-safe`** — `dotenv-safe` has been effectively unmaintained since 2022; `envalid` is the 2026 equivalent and gives typed parsed env values. The user mentioned `dotenv-safe` in the brief — **swap to `envalid`**.
- **`pino` over `winston`/`morgan`** — fastest structured logger, PII redaction built in via `redact` paths, JSON-by-default plays well with Fly's log forwarder.
- **JWT in localStorage** stays for POC (changing to httpOnly cookies is a larger refactor across client and server); document the XSS risk in CONCERNS and revisit when the monolith is split.

### 7. Fly.io Hosting (Backend + SQLite)

| Pick | Version | Confidence |
|---|---|---|
| **Single Fly Machine** + **Fly Volume** for `database.db` | — | HIGH |
| **NO LiteFS for POC** | — | HIGH |
| **Litestream** for continuous SQLite backup to S3-compatible storage (Tigris / R2) | `^0.3.x` | HIGH |
| `PRAGMA journal_mode=WAL` enabled on boot | — | HIGH |
| `better-sqlite3` migration: **defer to a later phase**, keep `sqlite3` for now | — | MEDIUM |

**Rationale:**
- **One family = one machine.** Fly Volumes are pinned to a host, which is exactly right for a single-writer SQLite setup. Volumes cap at 500 GB; we'll be at ~10 MB.
- **LiteFS is explicitly the wrong tool here.** It exists to replicate SQLite across multiple machines/regions (with a primary-writer model and `fly-replay` for write forwarding). One family on one machine doesn't need replication, and LiteFS adds:
  - FUSE mount complexity
  - ~100 writes/sec ceiling (irrelevant to us, but a real cliff later)
  - Operational ops we don't want in Phase 1
- **Litestream is the right backup tool for a single-node Fly SQLite app.** Streams WAL pages to S3-compatible storage in real time; restore is `litestream restore`. ~Free at family scale (Cloudflare R2 free tier covers us).
- **Volume sizing:** allocate 3 GB (DB itself ~10 MB; rest for WAL spill + ingested PDFs cached on disk if we choose to). Per Fly docs, leave 20–50% headroom.
- **WAL mode** is mandatory: better concurrent reads, plays well with Litestream.
- **`better-sqlite3` migration:** worth ~3–10x perf and simpler sync API, but **not Phase 1**. The current `sqlite3` promise wrappers work and rewriting them risks breaking the auth flow. Schedule for the same milestone that splits `server/server.js` into route modules.

### 8. Frontend Hosting (Vercel)

| Pick | Version | Confidence |
|---|---|---|
| Vercel for `dist/` only (static SPA) | — | HIGH |
| API proxy via `vercel.json` rewrites → `https://<app>.fly.dev/api/*` | — | HIGH |

**Rationale:**
- The Express server is **no longer** serving `dist/` once split — Vercel hosts the SPA, Fly hosts the API. This means the current `app.use(express.static('dist'))` line goes away in production.
- CORS becomes a real concern (not just an oversight) — production origin is `https://<project>.vercel.app`, dev is `http://localhost:5173`. Lock `ALLOWED_ORIGIN` to both.
- Cookies for auth become harder cross-origin — another reason to keep JWT-in-Authorization-header for now.

---

## What NOT to Use (and Why)

| Rejected | Why |
|---|---|
| **Tesseract / `tesseract.js`** | Native build pain in Fly Docker; multimodal LLM does the same job + extraction in one call |
| **LangChain / LangGraph (server)** | Heavy abstraction for a problem we don't have yet; one router prompt doesn't need a graph runtime |
| **Vercel AI SDK on the server** | We're not on Next.js server actions; OpenRouter via `fetch` is simpler |
| **BullMQ + Redis** | Adds a stateful dep for zero benefit on a single-instance POC |
| **LiteFS** | Multi-instance replication tool; single-family POC is single-instance by design |
| **`node-cron`** | Stale, no DST handling, no TS types; `croner` is strictly better in 2026 |
| **`node-schedule`** | Effectively unmaintained |
| **`node-telegram-bot-api`** | Plain event emitter; doesn't scale past toy bots |
| **Telegraf** | Fine, but docs regressed and grammY has clearer momentum + plugin ecosystem |
| **`dotenv-safe`** | Unmaintained since 2022; `envalid` is the modern equivalent |
| **`express-validator`** | Verbose chain API; `zod` schemas are reusable across API + LLM JSON-schema |
| **`joi`** | Heavier than zod, no TS-first design |
| **Push notifications (Drive `changes.watch`) in Phase 1** | Requires public HTTPS, channel renewal cron, signature verification — three new failure modes vs. one polling loop. Defer to v2. |
| **Service accounts for Drive** | Can't read a user's personal Drive without per-folder share UX; OAuth + refresh tokens is the correct path |
| **Switching to TypeScript in this milestone** | High churn, low value at POC scale; document JSDoc types instead. Revisit at multi-tenant time. |
| **Switching to Postgres / Supabase** | Explicit constraint in PROJECT.md — stay SQLite until multi-tenant |
| **Switching to `better-sqlite3` in Phase 1** | Worth doing, but ties into the route-decomposition refactor; not a security-hardening concern |
| **httpOnly cookies for JWT in Phase 1** | Cross-origin (Vercel ↔ Fly) cookies need `SameSite=None; Secure` + matching CORS credentials wiring — too much surface area for Phase 1 |
| **WhatsApp Cloud API** | Explicit out of scope; Telegram is the POC chat surface |

---

## Installation (POC end-state)

```bash
# Backend additions
npm install \
  googleapis google-auth-library \
  grammy \
  croner \
  helmet express-rate-limit \
  zod envalid \
  pino pino-http \
  sharp pdfjs-dist

# (Optional, when migrating perf-sensitive paths)
# npm install better-sqlite3

# Backend dev tooling (suggested, none mandatory)
npm install -D @types/express # JSDoc-friendly even without TS source
```

No frontend additions are required for the additive stack — all new capability is server-side.

---

## Confidence Summary

| Domain | Confidence | Why |
|---|---|---|
| Drive integration choice (polling, `googleapis`) | HIGH | Official SDK, polling is operationally trivial, push deferred is explicit |
| Telegram lib (grammY) | HIGH | Verified latest version (1.43.0, May 2026), broad consensus in comparisons |
| OCR approach (multimodal LLM + pdfjs fast-path) | HIGH | Already have OpenRouter wired, benchmarks support single-call extraction at family scale |
| Scheduler (croner, no Redis) | HIGH | Single-instance topology removes BullMQ's reason to exist |
| LLM proxy shape (bespoke routes, .md prompts) | HIGH | Matches the "single LLM router" principle in PROJECT.md |
| Security stack (helmet, rate-limit, zod, envalid, pino) | HIGH | Standard 2026 Express security stack; each verified against current npm |
| Fly.io topology (single machine + volume + Litestream, no LiteFS) | HIGH | LiteFS docs explicitly target multi-instance; single family is single instance |
| `better-sqlite3` migration timing | MEDIUM | Worth doing eventually; phase placement is a judgement call |
| Eventual switch to webhook mode (Drive push + Telegram webhook) | MEDIUM | Confirmed approach for v2 but not validated against our specific Fly setup |

---

## Sources

- [grammY framework](https://grammy.dev/) / [grammY npm v1.43](https://www.npmjs.com/package/grammy)
- [grammY vs alternatives](https://grammy.dev/resources/comparison)
- [Google Drive — Notifications for resource changes](https://developers.google.com/workspace/drive/api/guides/push)
- [Google Drive `changes.watch` reference](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/watch)
- [googleapis npm](https://www.npmjs.com/package/googleapis)
- [Fly.io — LiteFS docs](https://fly.io/docs/litefs/)
- [Fly.io — LiteFS FAQ (single vs multi-instance)](https://fly.io/docs/litefs/faq/)
- [Fly.io — Task scheduling blueprints (Cron Manager, Supercronic)](https://fly.io/docs/blueprints/task-scheduling/)
- [Croner / node-cron / node-schedule comparison (2026)](https://www.pkgpulse.com/guides/node-cron-vs-node-schedule-vs-croner-task-scheduling-2026)
- [BullMQ vs in-process schedulers (2026)](https://medium.com/@Daaniyahkhan/from-cron-jobs-to-bullmq-scaling-background-tasks-in-node-js-3e23c2c8baef)
- [express-rate-limit npm (v8.5.x)](https://www.npmjs.com/package/express-rate-limit)
- [helmet npm](https://www.npmjs.com/package/helmet)
- [better-sqlite3 vs sqlite3 benchmarks](https://dev.to/lovestaco/understanding-better-sqlite3-the-fastest-sqlite-library-for-nodejs-4n8)
- [Google Vision OCR docs](https://cloud.google.com/vision/docs/ocr)
- [AWS Textract / Google / Azure / GPT-4o invoice benchmark](https://www.businesswaretech.com/blog/research-best-ai-services-for-automatic-invoice-processing)
- [SQLite Edge Production 2026 (byteiota)](https://byteiota.com/sqlite-edge-production-2026-database-renaissance/)

---

*Stack research: 2026-05-20*
