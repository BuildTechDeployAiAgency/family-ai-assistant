# Feature Landscape — Family AI Assistant

**Domain:** Family operations assistant (household document vault + expiry tracker + school-comms hub) with Telegram-as-interface and Google Drive-as-input.
**Researched:** 2026-05-20
**Confidence:** MEDIUM-HIGH (competitor features verified via official sources and current reviews; AI-native differentiators derived from gap analysis vs verified features)

---

## Competitive Reference Matrix

| Product | Category | Relevant Features |
|---------|----------|-------------------|
| **1Password Families** | Vault / sharing | Private + shared vaults (up to 5 members), per-item sharing links with expiry, family organizer role, 250MB file size cap on shared items, secure document attachments |
| **Quicken LifeHub** | Household docs | Smart folders by life area, AES-256 at rest + TLS 1.2 in transit, MFA, renewal context attached to documents |
| **Cozi** | Family organizer | Shared calendar, color-coded per-family-member, lists, push + email reminders, recipe box, birthday tracking (Gold). NO native document storage. |
| **FamilyWall** | Family organizer | Shared calendar, location, lists, photo sharing, freemium ($4.99/mo Premium). NO native document storage. |
| **DocReminder / RenewalKit / RemindMe / NeuVault / GetReminded** | Single-purpose expiry trackers | Per-doc expiry dates, 7/15/30/60/90-day advance alerts, categories (passport, license, insurance, vehicle, warranties, memberships), iCloud sync |
| **ParentSquare** | School comms | Text + email + app + voice messaging from school, two-way translation (100+ languages), contact verification, StudentSquare for older students, conference scheduling |
| **ClassDojo** | School comms | Class Story feed, direct messaging teacher↔parent, digital portfolios, behavior points/dojo (elementary focus) |
| **Seesaw** | School comms | Student-centered portfolios, work artifacts (photos/videos/drawings), parent messaging, pre-K–3rd grade focus |

**Gap observed:** Family organizers (Cozi, FamilyWall) skip document storage entirely. Vault products (1Password) skip expiry-as-first-class. Expiry trackers (DocReminder, RenewalKit) don't classify or extract — user types every field manually. **Nobody bridges drop-a-file → classify → extract dates → assign to family member → remind via chat.** That's the AI-native wedge.

**Gap observed (school side):** ParentSquare/ClassDojo/Seesaw are school-side platforms — schools must adopt them. Parents whose schools don't use them are stuck with raw email. **Nobody surfaces per-child tasks from arbitrary school comms inputs (email forward, PDF newsletter, paper note photo).**

---

## Module 1: Document Vault — Table Stakes

These must work or users churn within a week.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Drive folder watch + ingest** | Core promise — drop file, it gets handled | Medium | Polling at 30-60s OK for POC; push notifications (Drive Push API) for v2. Dependency: Google OAuth. |
| **Auto-classification into categories** | Users won't tag manually after the first week | Medium | LLM call with category enum: passport, ID, driver's license, insurance (health/auto/home), utility bill, contract, vehicle reg, medical, financial, education, warranty, other. |
| **Per-document expiry/renewal date extraction** | Whole reason to use vs raw Drive | Medium-High | OCR (Tesseract or cloud) → LLM extraction. Must handle scanned PDFs and phone photos. RenewalKit/DocReminder force manual entry — beating that is table stakes. |
| **Advance reminders (configurable lead time)** | DocReminder, RenewalKit, GetReminded all do 7/15/30/60/90 days | Low | Cron job + Telegram push. Default cadence: 60d, 30d, 7d, 1d. |
| **Category browse + search** | Find a document later | Low-Medium | Filter by category, family member, date range; full-text search v2. |
| **Document preview / download** | Confirm correct file | Low | Render PDF, image inline; deep-link to Drive for edit. |
| **Per-family-member assignment** | "Whose passport is this?" | Low | Foreign key on document → family_member. LLM infers from content; user confirms. |
| **Manual override of AI decisions** | AI will be wrong 10-20% of the time | Low | Edit category, owner, expiry date inline. Trust-builder. |
| **Encryption at rest + transport** | Quicken LifeHub leads with AES-256, MFA | Medium | Drive provides at-rest already; ensure backend never logs file contents. |

---

## Module 1: Document Vault — Differentiators

AI-native edge over existing tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Zero-touch ingest** | Drop file in Drive → 60s later it's classified, dated, assigned, scheduled. No app to open. | Medium | This is THE wedge. Nobody else has it — closest is DocReminder which requires manual entry. |
| **Renewal action generation** | "Your passport expires in 60 days → here's the renewal URL + checklist + photo requirements" | Medium-High | LLM emits a task with steps. Differentiator vs pure date reminders. |
| **Auto-folder organization in Drive** | The Drive folder itself becomes self-organizing (subfolders by category/member) | Medium | Risky — users may not want files moved. Default = create symlinks/shortcuts; opt-in for moves. |
| **Conversational query via Telegram** | "When does Sara's passport expire?" → bot answers | Medium | RAG-lite over indexed docs. Differentiator vs UI-only competitors. |
| **Duplicate detection** | Same insurance policy uploaded twice → merge or warn | Medium | Hash + LLM similarity on extracted fields. |
| **Cross-document linking** | "This renewal notice belongs to the policy you uploaded in March" | High | Defer to v2 — needs entity resolution. |
| **Smart sharing scopes per family role** | Parents see everything; teens see own ID + school; caregiver sees medical only | Medium | Hybrid 1Password (shared vaults) + Quicken (life areas) model. |

---

## Module 1: Document Vault — Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Building our own file storage UI** | Google Drive already wins; reinventing storage = scope explosion | Treat Drive as source of truth; our DB stores metadata + AI extractions only |
| **Native mobile apps** | Telegram IS the mobile UX for v1 (project decision) | Telegram bot + responsive web for occasional config |
| **Auto-moving files in Drive without consent** | Users panic when files "disappear" | Tag with metadata / create shortcuts in organized subfolders; don't relocate originals |
| **Full password manager (1Password territory)** | Out of scope, secure-by-design overhead massive | If users want vault for credentials, recommend 1Password; we do documents |
| **Local-daemon directory watcher** | Already rejected in PROJECT.md | Cloud Drive only |
| **OCR'ing every page of long PDFs eagerly** | Cost balloons on 200-page bank statements | OCR first 3 pages + last page; full OCR on demand |

---

## Module 2: School Hub — Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Per-child profiles** | Multi-child families = majority of target market | Low | Already partially in schema. Name, school, grade, photo. |
| **Manual school-comms input** (paste text, upload PDF/image) | v1 has no email connector | Low-Medium | Form field + drag-drop; LLM processes immediately. |
| **Task extraction with child assignment** | Whole point of the module | Medium | LLM: "From this newsletter/email, extract action items, due dates, which child it concerns." Validate against child profiles. |
| **Per-child task dashboard view** | "Show me Sara's stuff" | Low | Filter on `tasks.family_member_id`. Already in UI shell. |
| **Due-date reminders via Telegram** | Same pipeline as doc reminders | Low | Reuse Module 1 reminder pipeline. |
| **Task completion / dismiss** | Existing in current schema | Low | Already implemented. |
| **Source linkback** | "Why does Sara have a swim kit task?" → see original email | Low | Store source comm ID with each task. Trust-builder. |

---

## Module 2: School Hub — Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Multi-input ingest (email forward, PDF, phone photo of paper note)** | ParentSquare/ClassDojo require schools to adopt them. We work with whatever school sends. | Medium | Photo-of-paper-newsletter is a killer use case for non-tech-forward schools. |
| **Confidence-scored extractions with user confirm** | LLMs hallucinate; admit it | Medium | "I think Sara needs gym kit on Tue. Confirm?" via Telegram inline buttons. |
| **Recurring task detection** | "Library books due every Friday" — extract pattern, not just single instance | Medium-High | Risky: requires looking across multiple ingestions. v1.5. |
| **Cross-child task grouping** | "Both kids have parent-teacher day on Nov 12" → one event, two assignments | Medium | Helps batching school runs/prep. |
| **Calendar export** | iCal/Google Calendar feed of school tasks | Low-Medium | One-way push to parent's calendar; defer two-way to v2. |
| **Summary digest (weekly)** | "Here's everything school-related coming this week" via Telegram | Low | Sunday-evening cron. Lightweight, high perceived value. |

---

## Module 2: School Hub — Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Direct teacher messaging** | That's ParentSquare/ClassDojo's lane; we'd need school-side adoption | Stay parent-side only; we read what's sent, we don't talk to schools |
| **Behavior tracking / grades / portfolios** | Already out of scope per PROJECT.md | School-side tools own this — we focus on action surfacing |
| **Auto-replying to school on parent's behalf** | Trust-destroying when wrong | Draft a reply for user review; never send autonomously |
| **Gmail/IMAP connector in v1** | Privacy concern called out in PROJECT.md | Manual paste/forward → v2 adds Gmail OAuth read-only |
| **Two-way calendar sync** | Adds OAuth scope + write conflicts | One-way export only in v1 |

---

## Cross-Cutting: Auth, Profiles, Sharing — Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Email/password auth (already exists)** | Project constraint | Done | Phase 1 hardening — move JWT off localStorage, rotate secrets. |
| **Family unit as primary entity** | All data scoped to a family | Medium | Refactor: users → family_id; documents/tasks/comms all FK family. Critical for v2 multi-tenant migration even if not enforced now. |
| **Family member profiles (adult + child)** | Per-child surfacing requires it | Low | Schema partially exists. Add role: parent/child/caregiver. |
| **Per-member access scopes** | Teen shouldn't see parent's medical records | Medium | Vault-style scopes (1Password model). v1 = simple roles; ACL granularity in v2. |
| **Google Drive OAuth** | Required for ingest | Medium-High | Drive API + offline refresh tokens. Single Drive folder per family. |
| **Telegram bot setup flow** | Family must link bot | Medium | Per-family bot or one bot with per-chat tokens. Use deep-link `t.me/bot?start=<family_token>` for binding. |

---

## Cross-Cutting: Notifications — Table Stakes

| Feature | Complexity | Notes |
|---------|------------|-------|
| **Telegram push for reminders** | Low | Telegram Bot API `sendMessage`. Use Markdown for rich formatting. |
| **Per-member notification routing** | Low | Each family member binds own Telegram chat_id; reminder routes by document owner. |
| **Inline-button confirmations** | Low-Medium | "Mark done / Snooze 7d / Dismiss" buttons on every reminder. Reduces UI dependency. |
| **Quiet hours** | Low | Per-family or per-member time window (e.g., 22:00–07:00). Important — annoying notifications = uninstall. |
| **Reminder deduplication** | Low | Don't fire same reminder twice if user already acted. |

---

## Cross-Cutting: LLM Router — Table Stakes

This is the core technical surface — feeds both modules.

| Feature | Complexity | Notes |
|---------|------------|-------|
| **Server-side OpenRouter proxy** | Low | Phase 1 critical (key currently in client). Rate limit per family. |
| **Single event dispatcher** | Medium | Inputs: Drive file event, Telegram message, manual paste. Outputs: classification, extraction, task generation, conversational reply. Per PROJECT.md decision. |
| **Prompt versioning** | Low | Store prompts in code with version tags; log which version produced which output. |
| **Confidence scoring on outputs** | Medium | Have LLM emit `{confidence: 0.0-1.0}` alongside extractions; below threshold → ask user. |
| **Output validation (JSON schema)** | Low-Medium | Use OpenRouter structured outputs or Zod validation; retry on malformed. |
| **Cost guardrails** | Low | Per-family monthly cap; alert when 80%. Critical for v2 SaaS — start metering now. |
| **Audit log of LLM actions** | Low | Every classification/extraction logged with input, output, model, cost. Required for debugging and user trust. |

---

## Cross-Cutting — Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"What did the AI do today?" digest** | Transparency = trust. Daily Telegram summary of actions taken. | Low | High value/cost ratio. |
| **Undo last AI action** | Wrong classification → one-tap revert | Medium | Stage AI changes; commit after user confirms or N hours pass. |
| **Family activity feed** | "Mum uploaded passport, Dad confirmed Sara's swim task" | Low | Cheap social-proof feature. |

---

## Anti-Features — Cross-Cutting

| Anti-Feature | Why Avoid |
|--------------|-----------|
| **OAuth login providers (Google/Apple SSO)** | Already out of scope per PROJECT.md; email/password is enough for POC |
| **Native mobile apps** | Telegram + web covers it; native = 6mo of work, no validation gain |
| **WhatsApp integration in v1** | PROJECT.md: Telegram only |
| **User-editable system prompts in v1** | Project decision — "skill-like" deferred to v2 |
| **Multi-tenant infra hardening in v1** | Single-family POC; just keep schema migration-friendly |
| **In-app calendar UI** | Already out of scope — calendar export is enough |

---

## Feature Dependencies

```
Phase 1 Security
  └─→ Server-side LLM proxy ─→ ALL AI features

Google Drive OAuth
  └─→ Folder watch
        └─→ Auto-classification
              ├─→ Expiry extraction
              │     └─→ Reminder pipeline ──┐
              └─→ Per-member assignment ────┤
                                            ▼
                          Telegram bot ←─── Push reminders
                                ▲
                                │
School comms ingest ────→ Task extraction
  (manual paste/upload)         │
                                ├─→ Per-child dashboard
                                └─→ Calendar export

Family/member schema  ─────────→ All scoping (docs, tasks, reminders)
LLM router  ───────────────────→ Both modules
```

**Critical path:** Server-side LLM proxy → Drive OAuth → folder watch → classification + extraction → reminders. Without this chain working end-to-end, the product is just a worse Cozi.

---

## MVP Recommendation

**Build first (Phase 2-3, post-security):**
1. **Drive folder watch + auto-classification** (table stakes wedge)
2. **Expiry extraction + Telegram reminders** (table stakes wedge)
3. **Per-child task extraction from manually-pasted school comms** (Module 2 wedge)
4. **Manual override UI for AI decisions** (trust)
5. **Family + member schema refactor** (foundation for everything else)

**Build next (Phase 4-5):**
6. Conversational Telegram queries
7. Renewal action generation with steps
8. Weekly school digest
9. Calendar export
10. Per-member access scopes

**Defer to v2:**
- Email connectors, recurring task detection, cross-document linking, two-way calendar, user-editable prompts, multi-tenant hardening, mobile native, WhatsApp.

---

## Sources

- [1Password Families overview](https://support.1password.com/explore/families/) — HIGH (official)
- [1Password Create and share vaults](https://support.1password.com/create-share-vaults/) — HIGH
- [1Password share items with expiry](https://support.1password.com/share-items/) — HIGH
- [Cozi feature overview (official)](https://www.cozi.com/feature-overview/) — HIGH
- [Cozi App Review 2025](https://ourcal.com/blog/cozi-app-review-2025) — MEDIUM
- [FamilyWall vs Cozi 2025](https://rigorousthemes.com/blog/familywall-vs-cozi/) — MEDIUM
- [ParentSquare platform overview](https://www.parentsquare.com/) — HIGH (official)
- [ParentSquare classroom comms](https://www.parentsquare.com/classroom-communications/teacher-student-communciation-app/) — HIGH
- [ClassDojo vs ParentSquare 2026 (GetApp)](https://www.getapp.com/education-childcare-software/a/classdojo/compare/parentsquare/) — MEDIUM
- [Common Sense Education — Best family communication platforms](https://www.commonsense.org/education/best-in-class/the-best-family-communication-platforms-for-teachers-and-schools) — MEDIUM
- [Quicken — Top apps for household docs and renewal reminders 2026](https://www.quicken.com/blog/top-apps-and-tools-for-household-document-and-renewal-reminders-2026/) — MEDIUM (vendor blog but useful feature inventory)
- [DocReminder App](https://apps.apple.com/us/app/docreminder/id6755967762) — HIGH (product page)
- [NeuVault Document Reminder](https://neuvault.app/document-reminder) — MEDIUM
- [RenewalKit (App Store)](https://apps.apple.com/us/app/expiration-reminder-renewalkit/id6758590671) — HIGH (product page)
- [GetReminded](https://www.getreminded.com/) — MEDIUM
