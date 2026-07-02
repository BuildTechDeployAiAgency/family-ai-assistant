# Feature plans — top-5 build queue

Build-ready implementation plans for the 5 features chosen in `../feature-research-2026-07-01.md`. Each doc is **independently shippable** and follows the same template (context → current state → schema → backend → mobile → AI agent → isolation review → effort → tasks → verification).

> **All docs are plans, not code.** Snippets are illustrative — verify every `path:line`, import path, and handler signature against the live repo before editing. The three exploration maps (backend / schema / mobile) that these were derived from are the source of truth for what exists today.

## The five

| # | Feature | Effort | Migration | Ships on PWA? | Doc |
|---|---------|--------|-----------|---------------|-----|
| 01 | Proactive reminders (attention feed + weekly digest via Vercel Cron) | M | `0009` prefs cols | ✅ (no native build) | [01-proactive-reminders.md](01-proactive-reminders.md) |
| 02 | Family calendar + appointments | M | none (table exists) | ✅ | [02-family-calendar-appointments.md](02-family-calendar-appointments.md) |
| 03 | Grounded source cards | S–M | none | ✅ | [03-grounded-source-cards.md](03-grounded-source-cards.md) |
| 04 | Auto-memory proposals | S–M | none | ✅ | [04-auto-memory-proposals.md](04-auto-memory-proposals.md) |
| 05 | Telegram ingestion (drop → auto-file) | L | `0009` telegram verify | backend + PWA | [05-telegram-ingestion.md](05-telegram-ingestion.md) |

## Recommended build order

```
03 source cards ──▶ 04 auto-memory ──▶ 02 calendar ──▶ 01 reminders ──▶ 05 telegram
   (S, additive)      (S–M)              (M, feeds 01)    (M)              (L, isolation-critical)
```

Rationale:
1. **03 first** — smallest, purely additive (no migration, no new table), and the clearest trust payoff. Warms up the ask-loop + mobile Turn changes.
2. **04 next** — small, reuses the ask loop; schema already supports `proposed`/`inferred`. Makes the assistant feel like it learns.
3. **02 calendar** — the `appointments` table already exists; unlocks a whole class of agent queries and **feeds 01**.
4. **01 reminders** — consumes expiries + tasks + (from 02) appointments into an attention feed + weekly digest. First migration lands here (`0009` prefs columns).
5. **05 telegram** — the big, isolation-critical bet. Build last; the P0 verified-binding section is the centerpiece. Needs bot hosting + server-only env.

## Dependency graph (acyclic)

- **03** → none. Independent.
- **04** → none. (Shares the ask-loop file `api/ai/ask.ts` with 03 — sequence to avoid merge churn.)
- **02** → none. Adds `get_appointments` tool + `/calendar` route (which 03's appointment source cards link to).
- **01** → *soft* on **02** (attention feed ranks appointments; degrades gracefully to documents+tasks only if 02 not yet shipped).
- **05** → depends on the extract/documents/communications/members primitives (all exist today); build after 01–04 so the app surfaces (memory, calendar) that ingested data flows into are ready.

## Migration numbering

Next free migration is **`0009`**. Both **01** (preferences notification columns) and **05** (telegram verification columns) target `0009` — whichever ships first takes `0009`, the other becomes `0010`. Do not double-book the number.

## Invariants every plan preserves

- **Family isolation** — `family_id` from the JWT (`api/_lib/http.ts authenticate()`), never the request body; RLS via `auth_family_id()`. Background/service-role paths (01 cron, 05 webhook) resolve `family_id` from a verified source and add an explicit `.eq('family_id', …)` on every query. **A cross-family read >0 rows = P0.**
- **AI key server-only** — all model calls via `api/ai/*`; no `VITE_`/`EXPO_PUBLIC_` prefix on secrets.
- **REFERENCE_DATE = 2026-05-19** — deterministic "today" for all expiry/urgency/date math.
- **Almanac design locked** — warm cream + cobalt `#2A4FC4`, Bricolage + Hanken, tokens in `mobile/src/constants/theme.ts`; reuse `components/ui.tsx` + `components/States.tsx`.

## Source

Derived from `../feature-research-2026-07-01.md` (competitive scan + backlog) and three read-only codebase exploration maps (backend API + AI agent, Supabase schema `0001–0008`, mobile app). No product code was changed to produce these plans.
