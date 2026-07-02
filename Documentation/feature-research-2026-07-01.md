# Family AI Assistant — Feature Research & Prioritized Backlog

_Product research report · 2026-07-01 · research-only (no product code changed)_

---

## Executive Summary

The Family AI Assistant today is a **document-and-obligations brain** for one household: it stores family documents, tracks expiries/renewals, holds per-child school tasks and results, and answers natural-language questions through a server-side, RLS-grounded AI agent that only ever sees the family's own data. The mobile app (Expo/React Native, Almanac design) already ships a "Today" home, a document Vault, per-child Actions, a School tab, an Ask chat, action-detail with checkable steps, and a Profile/memory/preferences area. The backend (Vercel serverless + Supabase) already has schema for the pieces the app hasn't surfaced yet — `appointments`, `communications`, `embeddings` (pgvector), `telegram_links`, `ingestion_events`, `family_memory`, `preferences` — so several high-value features are "wire up what exists" rather than net-new plumbing.

The competitive scan (Cozi, FamilyWall, Maple, Ohai.ai, Yohana, Skylight/Hearth, and the document-vault niche) shows the market splits into two camps this app is uniquely positioned to bridge:
1. **Calendar/chore organizers** (Cozi, Maple, Skylight) — strong on shared calendar, lists, chores, meal planning; weak on documents and true AI grounding.
2. **AI mental-load assistants** (Ohai.ai, Yohana) — proactive reminders, school-calendar scanning, task delegation; but thin document memory and, for Yohana, expensive human-in-the-loop.

**This app's moat is the grounded document layer + per-child context.** No competitor combines "reliable private document/expiry memory" with "an AI that answers from *your* data" and "per-child school tracking." The strongest near-term bets double down on that: proactive expiry/renewal notifications, calendar/appointments, grounded source cards, ingestion (Telegram + email/Drive), and auto-memory.

### Top 5 features to build first

- **Proactive notifications engine (expiries + due tasks)** — push/Telegram reminders on the data already tracked. This is the #1 thing families pay for across every competitor, and the app tracks the dates but never proactively reminds. Turns a passive vault into an assistant. *(Now, M)*
- **Family calendar + appointments** — surface the empty `appointments` table as a real shared calendar with conflict detection. Closes the biggest gap vs. every organizer app and unlocks "when's Bella's dentist?" queries for the agent. *(Now/Next, M)*
- **Grounded source cards in AI answers** — tap a claim → see the exact document/email it came from. Pure trust feature, differentiator vs. generic chatbots, and the mockup already exists. *(Now, S–M)*
- **Telegram + email/Drive ingestion (drop → auto-file)** — the original core value prop ("drop a doc, it classifies and files itself"). Schema (`telegram_links`, `ingestion_events`) is stubbed; this is what makes the vault fill itself instead of manual entry. *(Next, L)*
- **Auto-memory proposals** — let the agent propose facts from documents/answers (`status='proposed'` → user confirms). Schema already supports it; write path is manual-only today. Makes the assistant feel like it *learns*. *(Now/Next, S–M)*

Full report saved to: `documentation/feature-research-2026-07-01.md`

---

## Step 1 — What Exists Today

### Core value proposition
A mobile-first family operations assistant that organizes household documents, tracks expiries/renewals, surfaces per-child school tasks, and answers natural-language questions via a **server-side tool-calling AI agent grounded ONLY in the family's own data**. Single-family POC now; multi-tenant SaaS later. The non-negotiable invariant is **family isolation** (every row `family_id`-scoped, enforced by Supabase RLS via `auth_family_id()`), and the **AI key is server-only** (all model calls go through `api/ai/*`).

### Screens (live in the Expo app)
From `mobile/src/app/`:
- **Today** (`(tabs)/today.tsx`) — anticipatory home; "focus" card for soonest-expiring doc, "On your plate" sticky-note reminders (dated tasks by child), "Recently filed" list, camera FAB → scan.
- **Vault / Documents** (`(tabs)/index.tsx`, `document/[id].tsx`) — Almanac document grid with search, category chips, 2-up cards; per-doc detail.
- **School** (`(tabs)/school.tsx`) — per-child school view.
- **Actions** (`(tabs)/actions.tsx`, `action/[id].tsx`) — per-child task board (owner avatar tabs, open/done groups, sage-tick complete), action detail with lifecycle + checkable steps.
- **Ask** (`(tabs)/ask.tsx`) — AI chat tab; renders assistant markdown replies.
- **Scan** (`scan.tsx`) — capture → AI extract (`api/ai/extract`); on web, photo-picker shim.
- **Email/communication detail** (`email/[id].tsx`).
- **Auth** (`(auth)/login.tsx`, `register.tsx`) — Supabase email/password; real-family seed on signup.
- **Profile** (`profile/index.tsx`, `member/[id]`, `memory.tsx`, `preferences.tsx`, `notifications.tsx`) — member management, agent memory, caller preferences, notification settings (screen exists; delivery engine does not).

### Data model (Supabase, `family_id`-scoped + RLS)
Tables (migrations `0001`–`0008`):
- **Core:** `families`, `users`, `family_members` (with aliases/nicknames for fuzzy resolution).
- **Domain:** `documents` (title, category, document_number, expiry_date, status, progress), `tasks` (priority, due_date, completed, member-owned), `school_results` (subject, term, grade, numeric_score, result_date), `communications` (email/message store), `appointments` (present, **not yet surfaced in UI**), `action_steps` (checkable steps, migration 0008).
- **AI layer:** `family_memory` (proposed/active/archived facts), `preferences` (caller prefs), `embeddings` (**pgvector — present, unused**), `llm_audit_log` (token/cost per call).
- **Ingestion (stubbed, unused):** `telegram_links`, `ingestion_events`, `activity_log`.

### AI agent capabilities (`api/`)
Server-side tool-calling agent (`api/ai/ask.ts`, `api/ai/extract.ts`) with a grounded system prefix built by `_lib/profileCard.ts` (injects salience-ranked family memory, ≤1800 chars, + caller prefs). Tools (`_lib/tools.ts`, all RLS-scoped, 50-row cap, server-side name resolution):
- `get_documents` (by member/category/expiring-within-days)
- `get_tasks` (by member/due-within-days)
- `get_school_results` (by child/subject)
- `get_family_member` (fuzzy name → canonical, handles nicknames/ambiguity)

`REFERENCE_DATE` (2026-05-19) is the deterministic "today" for expiry math. Model = `openai/gpt-4o-mini` via OpenRouter (agent + extract tiers).

### Integrations
- **Live:** Supabase (Auth + Postgres + RLS), Vercel serverless, OpenRouter (AI). Deployed as installable PWA (`family-ai-app.vercel.app`) + backend (`family-ai-assistant-livid.vercel.app`).
- **Planned / stubbed:** Telegram ingestion (`telegram_links` table exists, no bot), Google Drive ingestion (`ingestion_events` exists, no watcher), pgvector semantic search (`embeddings` table exists, unused), proactive/notification engine (Profile screen exists, no delivery).

### Built vs. planned (per HANDOFF §5–6)
- **Built & live:** RLS + per-family isolation, CRUD API, grounded AI ask, mobile tabs on live data, Almanac redesign, Today home, Actions per-child, action steps, agent memory-injection loop (manual facts), Profile/prefs screens, PWA.
- **Not yet built:** proactive/notification delivery, Telegram/Drive ingestion, pgvector semantic search, auto-memory proposals (facts are manual-write only), grounded source cards (mockup only), appointments/calendar UI, on-device scan E2E, TestFlight build, multi-tenant hardening.

---

## Step 2 — Competitive & Trend Research

### Direct competitors

**Cozi** (cozi.com) — The #1 family organizer. Shared color-coded calendar, to-do & grocery lists, reminders, meal planner, family journal. Free w/ Cozi Gold upsell. **Standout paid features:** shared calendar everyone can see, reminders that reach the right person, grocery/to-do lists. Strong on scheduling, **zero document/expiry intelligence, no AI grounding.**

**FamilyWall** (familywall.com) — Shared schedules, grocery lists, dinner/meal planning, to-dos, **location sharing**, private family messaging, shared photo albums. Broader "family social" surface than Cozi.

**Maple** (growmaple.com) — Positioned as an "all-in-one family operating system": shared calendar + **family email inbox** + to-do/task manager + **chore tracker** + meal planner + project management + document storage. The most feature-complete organizer; closest to this app's ambition but weaker on private grounded AI. Their own 2026 roundup pushes "shared email" and "assistant for your whole household" messaging.

**Ohai.ai** (ohai.ai) — AI household assistant ("O"). Combines all family calendars into one smart view, **detects scheduling conflicts**, auto-schedules events, sends automatic reminders, **scans school calendars/emails**, detects local events, and lets you **delegate tasks** on busy days. Recently raised strategic capital. This is the closest *AI-native* competitor; its wedge is calendar+reminders, not documents.

**Yohana** (yohana.com, Panasonic) — Premium (~$129/mo) human+AI personal-assistant service that offloads "joy-stealing tasks" and reduces the parental mental load. Proves families will **pay meaningfully** to offload household admin; the price ceiling shows room for a cheaper AI-first product.

**Skylight Calendar / Hearth Display** — Wall-mounted touchscreen family hubs. Smart calendar with auto-import, **kid-friendly routines/chore charts with rewards**, AI meal planner, lists. Hearth markets "AI-powered" scheduling and "grows with your kids." Shows demand for **chore/routine/reward systems** and a glanceable command-center home screen.

**Document/expiry vault niche** (Quicken LifeHub, Everplans, DigiVault, Travel Document Vault, DocStow, RemindMe) — Passport/visa/licence/insurance tracking, **90-day expiry reminders**, post-expiry nudges, scan-to-store, **zero-knowledge/private storage** positioning. This is exactly the layer this app already owns — but these apps have **no AI and no family/per-child context**, which is the opening.

**Chore & allowance apps** (Chores & Allowance Bot, Greenlight, BusyKid, iAllowance) — Chore assignment, allowance tracking, savings goals, reward redemption. Adjacent monetizable module.

### 2025–2026 trends in AI household assistants
- **Carrying the "mental load"** is the dominant narrative (Partnership on AI, NYT, Parents.com). Parents already improvise with ChatGPT; purpose-built grounded assistants win on trust + memory.
- **Proactive, timely reminders** beat passive storage — the feature every review singles out ("the real game-changer is those timely reminders").
- **School integration** — scanning school calendars/emails and auto-extracting term dates, events, and per-child tasks (Ohai's headline back-to-school feature).
- **Calendar conflict detection** and auto-scheduling across a unified family view.
- **Task delegation** between partners/caregivers.
- **Meal planning + auto grocery lists** (near-universal).
- **Chore/allowance/reward systems** for kids.
- **Medical/vaccine records & health tracking** — a rising ask (and a regulatory-sensitive one; 2026 saw 70+ state bills on AI chatbots, so health advice must stay factual/grounded, not diagnostic).
- **Bill/subscription tracking** and renewal management.
- **Emergency/critical info** (allergies, blood type, emergency contacts) in one glanceable place.
- **Privacy as a selling point** — zero-knowledge, "your data stays yours." This app's server-only key + strict RLS is a marketable strength.

---

## Step 3 — Prioritized Feature Backlog for THIS App

Effort: **S** = days, **M** = ~1–2 wks, **L** = multi-week. Every feature must preserve the two invariants: **family isolation** (server queries derive `family_id` from JWT/verified channel link, never the request body) and **AI key server-only**.

### Theme A — Notifications & Proactivity

**A1. Proactive reminder engine (expiries + due tasks)** — Scheduled push/Telegram nudges when a document nears expiry or a task comes due.
- *Why it fits:* The app already stores `expiry_date` and `due_date` and has a Profile › notifications screen with no delivery behind it. Pure activation of existing data.
- *User value:* Turns a passive vault into an assistant; #1 feature families cite across Cozi/Ohai/vault apps ("timely reminders are the game-changer").
- *Effort:* **M** (Vercel Cron + Expo push tokens; Telegram optional).
- *Deps/risks:* Needs a per-family scheduled job that reads with a **verified** `family_id` (service-role on a background path — carefully scoped, the one sanctioned non-JWT read; must add explicit `family_id` filter). Notification prefs table.
- *Tier:* **Now.**

**A2. Weekly "family digest"** — A Sunday AI-written summary (expiring soon, this week's tasks/appointments, new school items) via push/Telegram/email.
- *Why it fits:* Reuses the grounded agent + notification pipe from A1.
- *User value:* One glance to see the week; the "mental load" relief the market sells.
- *Effort:* **S** on top of A1.
- *Tier:* **Next.**

**A3. Smart escalation** — If an urgent expiry (≤7 days) is unacknowledged, re-notify and optionally ping a second caregiver.
- *Why it fits:* Extends A1; supports the multi-caregiver model.
- *Effort:* **S.** *Tier:* **Later.**

### Theme B — Calendar & Scheduling

**B1. Family calendar + appointments UI** — Surface the existing `appointments` table as a shared calendar (month/agenda), member-color-coded.
- *Why it fits:* Table already exists and is unused; biggest gap vs. every organizer competitor.
- *User value:* "When's Bella's dentist?" becomes answerable; unifies the scattered schedule.
- *Effort:* **M** (UI + `api/appointments` CRUD + agent tool `get_appointments`).
- *Deps/risks:* Add a tool to `_lib/tools.ts` (mirror `get_tasks` RLS pattern).
- *Tier:* **Now/Next.**

**B2. Conflict detection** — Flag overlapping appointments/tasks across members.
- *Why it fits:* Ohai's headline feature; trivial once B1 lands.
- *Effort:* **S.** *Tier:* **Next.**

**B3. Two-way Google/Apple Calendar sync** — Import existing family calendars, write back appointments.
- *User value:* Removes double-entry; adoption unlock.
- *Effort:* **L** (OAuth, sync engine). *Deps/risks:* new OAuth surface; keep tokens server-side.
- *Tier:* **Later.**

### Theme C — Ingestion (fill the vault automatically)

**C1. Telegram drop → auto-classify → file** — A Telegram bot the family forwards docs/photos/school emails to; server extracts + files into the right category/child.
- *Why it fits:* The **original core value prop**; `telegram_links` + `ingestion_events` tables already stubbed. Reuses `api/ai/extract`.
- *User value:* Vault fills itself instead of manual entry — the difference between a database and an assistant.
- *Effort:* **L** (bot, channel-link verification, extract pipeline).
- *Deps/risks:* **Family-isolation critical** — the channel link must be the verified `family_id` source; a mis-linked chat leaks data (P0). No request-body family_id.
- *Tier:* **Next** (highest-impact bigger bet).

**C2. Email forwarding address (school emails → tasks/docs)** — Each family gets a unique inbound address; forwarded school emails auto-extract term dates, events, per-child tasks.
- *Why it fits:* `communications` table exists; mirrors Ohai's school-email scanning.
- *User value:* School admin auto-captured per child — the app's per-child strength applied to the #1 inbound channel.
- *Effort:* **M–L** (inbound email provider + extract → tasks/appointments).
- *Tier:* **Next.**

**C3. Google Drive folder watcher** — Watch a shared Drive folder; new files auto-ingested.
- *Why it fits:* Named v1 channel; `ingestion_events` stub exists.
- *Effort:* **L** (Drive OAuth + change polling).
- *Tier:* **Later.**

### Theme D — AI Assistant Depth

**D1. Grounded source cards** — Under each AI answer, show tappable cards linking to the exact document/task/email the claim came from.
- *Why it fits:* Mockup already exists; agent already knows which rows it read. Trust differentiator vs. generic chatbots.
- *User value:* "Prove it" — families trust an assistant that cites their own paperwork.
- *Effort:* **S–M** (return tool-result row IDs to the client; render cards).
- *Tier:* **Now.**

**D2. Auto-memory proposals** — Agent proposes facts from docs/answers (`family_memory.status='proposed'`) → user confirms in Profile › Memory (amber confirm cards).
- *Why it fits:* Schema supports proposed/active/archived; write path is manual-only today.
- *User value:* The assistant visibly *learns* the family (dog's name, doctor, allergies).
- *Effort:* **S–M.** *Deps/risks:* keep proposal generation server-side; user stays in control (no silent writes).
- *Tier:* **Now/Next.**

**D3. Semantic search over documents (pgvector)** — Embed document text/extractions; enable "find the letter about the boiler service."
- *Why it fits:* `embeddings` table already present, unused.
- *User value:* Retrieval beyond exact fields; scales as the vault grows.
- *Effort:* **M** (embedding on ingest + a `search_documents` tool).
- *Tier:* **Next.**

**D4. Voice ask** — Speak questions to the agent (mobile speech-to-text → existing `api/ai/ask`).
- *Effort:* **M.** *Tier:* **Later.**

### Theme E — Kids & School

**E1. School term / event calendar per child** — Extract term dates, holidays, parents' evenings, deadlines from school comms into per-child appointments.
- *Why it fits:* Combines C2 + B1; the app's per-child model is its edge.
- *User value:* Never miss a non-uniform day or deadline.
- *Effort:* **M** (on top of C2/B1). *Tier:* **Next.**

**E2. Chore & routine board with rewards** — Assign recurring chores per child, streaks/stars, optional allowance tally.
- *Why it fits:* `tasks` already member-owned; Actions UI exists. Skylight/Hearth prove demand.
- *User value:* Kid engagement + allowance in the same app.
- *Effort:* **M.** *Tier:* **Later** (adjacent, monetizable module).

**E3. School results trends** — Chart `school_results` over terms; agent summarizes progress ("Bella's maths up two grades").
- *Why it fits:* `get_school_results` + `school_results` already exist.
- *Effort:* **S.** *Tier:* **Next.**

### Theme F — Money / Bills

**F1. Bill & subscription renewal tracker** — Track recurring bills/subscriptions with renewal dates; feed the reminder engine.
- *Why it fits:* Same date-tracking + notification pattern as expiries; `documents` category can extend or a `bills` table added.
- *User value:* Catch price hikes / unwanted renewals — a top 2026 money-saving ask.
- *Effort:* **M.** *Tier:* **Next.**

### Theme G — Health & Safety

**G1. Family health & vaccine records** — Store immunizations, allergies, meds, blood type per member; expiry reminders for prescriptions.
- *Why it fits:* Per-member model + document vault extend naturally.
- *User value:* One place for the info you scramble for at the ER or a new GP.
- *Effort:* **M.** *Deps/risks:* health data = extra sensitivity; keep AI **factual/retrieval only, never diagnostic** (2026 AI-chatbot regulation). Encryption-at-rest messaging.
- *Tier:* **Later.**

**G2. Emergency info card** — One glanceable, offline-cached screen: emergency contacts, allergies, blood type, insurance/policy numbers.
- *Why it fits:* Reuses member + document data.
- *User value:* High-stakes, low-effort; strong trust/marketing hook.
- *Effort:* **S.** *Tier:* **Next.**

### Theme H — Multi-tenant / SaaS enablers

**H1. Multi-caregiver invites & roles** — Invite a partner/caregiver to the same family with role-scoped access.
- *Why it fits:* Required for delegation (Ohai/Maple) and for the SaaS path.
- *User value:* Both parents in one shared brain.
- *Effort:* **M.** *Deps/risks:* **Family-isolation critical** — invite flow must bind the new user to the correct `family_id` via a verified token, never a client-supplied id.
- *Tier:* **Next** (SaaS enabler).

**H2. Onboarding + household setup wizard** — Guided first-run: add members, connect a channel, seed first docs.
- *Effort:* **M.** *Tier:* **Later** (pre-launch).

**H3. Billing / subscription (SaaS)** — Stripe tier gating (free vault vs. AI/ingestion tiers).
- *Effort:* **L.** *Tier:* **Later.**

### At-a-glance priority matrix

| Tier | Features |
|---|---|
| **Now** | A1 Proactive reminders · D1 Grounded source cards · D2 Auto-memory · B1 Calendar/appointments (start) |
| **Next** | C1 Telegram ingest · C2 Email forwarding · A2 Weekly digest · B2 Conflict detection · D3 pgvector search · E1 School calendar · E3 Results trends · F1 Bills/subs · G2 Emergency card · H1 Caregiver invites |
| **Later** | A3 Escalation · B3 Calendar sync · C3 Drive watcher · D4 Voice · E2 Chores/rewards · G1 Health records · H2 Onboarding · H3 Billing |

### The 3–5 to build first (and why)
1. **A1 Proactive reminders** — the single most-cited paid feature in the whole market, and the app already holds the dates. Highest value-to-effort ratio; converts the vault into an assistant.
2. **B1 Calendar/appointments** — closes the biggest competitive gap (every organizer has it, this app doesn't) using a table that already exists; also feeds A1 and unlocks a whole class of agent queries.
3. **D1 Grounded source cards** — cheap, mockup-ready, and the clearest trust differentiator vs. ChatGPT-style guessing. Reinforces the core "grounded in your data" promise.
4. **D2 Auto-memory** — small effort on existing schema; makes the assistant feel alive and learning, which is the emotional hook the "mental load" narrative sells.
5. **C1 Telegram ingestion** (bigger bet, start now) — delivers the founding promise (drop → auto-file). Higher effort and isolation-sensitive, so scope carefully, but it's what makes the product self-sustaining rather than a manual database.

---

## Sources
- Cozi — https://www.cozi.com/ · https://apps.apple.com/us/app/cozi-family-organizer/id407108860
- FamilyWall — https://www.familywall.com/en/index.html
- Maple — https://apps.apple.com/az/app/maple-family-assistant/id1551070188 · https://www.growmaple.com/blog-posts/best-family-calendar-app
- Ohai.ai — https://www.ohai.ai/ · https://www.ohai.ai/features/ · https://apps.apple.com/us/app/ohai-ai-household-assistant/id6477802468 · https://traded.co/blog/ohai-ai-raises-strategic-capital-to-advance-ai-assistant-for-family-productivity/
- Yohana — https://www.nytimes.com/2024/04/24/arts/artificial-intelligence-assistants-parents.html · https://www.parents.com/parenting/better-parenting/i-tried-a-parenting-personal-assistant-app-and-heres-why-i-loved-it/
- Skylight Calendar — https://myskylight.com/calendar
- Hearth Display — https://hearthdisplay.com/
- Document/expiry vaults — https://www.quicken.com/blog/top-apps-and-tools-for-household-document-and-renewal-reminders-2026/ · https://digivault.vtechworks.com/ · https://traveldocumentvault.com/features/ · https://www.docstow.com/passport-expiry-reminder · https://apps.apple.com/us/app/document-expiration-remindme/id6478255369
- Chores & allowance — https://apps.apple.com/us/app/chores-allowance-bot/id629797415 · https://www.bankrate.com/personal-finance/family-apps-to-manage-allowances-and-chores/
- Mental-load / AI-for-parents trends — https://partnershiponai.org/can-ai-apps-help-carry-the-mental-load-for-moms/ · https://peacockparent.com/the-3-best-ai-tools-for-parents-that-actually-save-you-time/ · https://familymind.ai/blog/10-best-ai-tools-to-keep-your-family-organized-and-save-hours-every-week · https://columbiacountyspotlight.com/2025/06/17/ai-is-helping-parents-lighten-the-mental-load-and-reclaim-time-for-what-matters-most/
- AI health-chatbot regulation context — https://www.manatt.com/insights/newsletters/health-highlights/manatt-health-health-ai-policy-tracker
