# Graph Report - .planning  (2026-06-02)

## Corpus Check
- Corpus is ~49,672 words - fits in a single context window. You may not need a graph.

## Summary
- 230 nodes · 309 edges · 19 communities (11 shown, 8 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Document & Reminder Pipeline|Document & Reminder Pipeline]]
- [[_COMMUNITY_Vercel API Functions|Vercel API Functions]]
- [[_COMMUNITY_Email & Env Config|Email & Env Config]]
- [[_COMMUNITY_GSD Agent Skills|GSD Agent Skills]]
- [[_COMMUNITY_GSD Workflow Config|GSD Workflow Config]]
- [[_COMMUNITY_Supabase RLS & Migrations|Supabase RLS & Migrations]]
- [[_COMMUNITY_Security Concerns & Anti-Patterns|Security Concerns & Anti-Patterns]]
- [[_COMMUNITY_Workflow Automation Settings|Workflow Automation Settings]]
- [[_COMMUNITY_Document API & Auth|Document API & Auth]]
- [[_COMMUNITY_Current Tech Stack|Current Tech Stack]]
- [[_COMMUNITY_Zod Validation|Zod Validation]]
- [[_COMMUNITY_JWT Auth|JWT Auth]]
- [[_COMMUNITY_Architecture Analysis|Architecture Analysis]]
- [[_COMMUNITY_Codebase Structure|Codebase Structure]]
- [[_COMMUNITY_Conventions|Conventions]]
- [[_COMMUNITY_Integrations|Integrations]]
- [[_COMMUNITY_Testing Gap|Testing Gap]]
- [[_COMMUNITY_Supabase CLI Pitfall|Supabase CLI Pitfall]]
- [[_COMMUNITY_Supabase CLI|Supabase CLI]]

## God Nodes (most connected - your core abstractions)
1. `Plan 01-03: Vercel Serverless Functions & Frontend Auth Swap` - 18 edges
2. `workflow` - 16 edges
3. `Phase 01 Context: Implementation Decisions D-01..D-16` - 16 edges
4. `Plan 01-02: Supabase Schema, RLS & Repo Wrappers` - 15 edges
5. `supabase/migrations/20260521000000_initial.sql` - 13 edges
6. `Phase 1: Security & Backend Foundation` - 12 edges
7. `Row-Level Security (RLS) Policy Template` - 12 edges
8. `Module 1: Document Vault` - 11 edges
9. `Research: Technology Stack` - 11 edges
10. `Phase 01 Research: Supabase+Vercel Stack` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Tech Debt: Mock Data in Production (Hassan family)` --semantically_similar_to--> `Module 2: School Hub`  [INFERRED] [semantically similar]
  .planning/codebase/CONCERNS.md → .planning/REQUIREMENTS.md
- `Pitfall: Missed Reminders After Downtime (C3)` --conceptually_related_to--> `Reminder Pipeline`  [INFERRED]
  .planning/research/PITFALLS.md → .planning/REQUIREMENTS.md
- `activeTab State Navigation` --semantically_similar_to--> `React Router DOM`  [INFERRED] [semantically similar]
  .planning/codebase/ARCHITECTURE.md → .planning/REQUIREMENTS.md
- `Project State` --references--> `Phase 1: Security & Backend Foundation`  [EXTRACTED]
  .planning/STATE.md → .planning/ROADMAP.md
- `Phase 1: Security & Backend Foundation` --conceptually_related_to--> `Helmet Security Headers`  [EXTRACTED]
  .planning/ROADMAP.md → .planning/research/STACK.md

## Hyperedges (group relationships)
- **Critical LLM Pitfalls: Prompt Injection + Hallucinated Dates + Family Scoping Leak** — concept_prompt_injection, concept_hallucinated_dates, concept_family_scoping_leak, concept_llm_router [EXTRACTED 0.92]
- **Core Value Loop: Drive File → LLM Router → Classification → Telegram Reminder** — concept_google_drive, concept_llm_router, concept_document_vault, concept_reminder_pipeline, concept_telegram_bot [EXTRACTED 0.95]
- **Phase 1 Security Hardening: Client-Key + Default-Secret + Open-CORS → Fix** — concept_client_side_api_key, concept_default_jwt_secret, concept_wide_cors, phase1_security_foundation [EXTRACTED 0.95]
- **RLS Security Boundary: Schema + Policies + Test + Wrappers** — concept_rls, artifact_initial_migration, artifact_test_rls, artifact_lib_db_documents, req_data04 [EXTRACTED 0.95]
- **Serverless Hardening Stack: env+zod+pino+ratelimit+headers** — artifact_lib_env, stack_zod, artifact_lib_logger, artifact_lib_ratelimit, artifact_vercel_json, concept_function_entry [EXTRACTED 0.92]
- **Supabase Pivot Decision Chain: Discussion -> Context -> Plans** — phase01_discussion, phase01_context, decision_d01, decision_d02, plan_0101, plan_0102, plan_0103 [EXTRACTED 0.90]
- **GSD Workflow Quality Gates** — config_workflow_research, config_workflow_plan_check, config_workflow_verifier, config_workflow_code_review, config_workflow_node_repair, config_workflow_ui_safety_gate [INFERRED 0.85]
- **PR Body Sections Configuration** — config_pr_section_userstories, config_pr_section_risks, config_pr_section_metrics, config_pr_section_stakeholder [EXTRACTED 1.00]
- **PR Source Planning Documents** — config_requirements_md, config_plan_md, config_verification_md [EXTRACTED 1.00]

## Communities (19 total, 8 thin omitted)

### Community 0 - "Document & Reminder Pipeline"
Cohesion: 0.07
Nodes (45): Pattern: Claim-Then-Send Idempotency, Competitive Gap: AI-native drop-file-classify-remind, Croner Job Scheduler, Module 1: Document Vault, Pitfall: Drive Page Token Loss (C1), Pattern: Expiry Source-Text Verification, Family Entity (family_id scoping), Pattern: family_id NOT NULL on All Domain Tables (+37 more)

### Community 1 - "Vercel API Functions"
Cohesion: 0.06
Nodes (38): api/ai/complete.js (OpenRouter server-side proxy), api/health.js (env validation surface), api/tasks/index.js and [id].js, lib/db/tasks.js, lib/logger.js (pino with PII redaction), lib/ratelimit.js (Upstash aiLimit), src/lib/supabase.js (browser anon-key client), test/rls.test.js (cross-family RLS denial test) (+30 more)

### Community 2 - "Email & Env Config"
Cohesion: 0.09
Nodes (30): api/emails/index.js and sync.js, .github/dependabot.yml (weekly npm scanning), .env.example (required env var contract), lib/db/emails.js, lib/env.js (envalid cleanEnv), lib/today.js (replaces REFERENCE_DATE constant), src/fixtures/hassan.js (DEV-gated seed data), Thin Repository Wrapper Pattern (lib/db/*.js) (+22 more)

### Community 3 - "GSD Agent Skills"
Cohesion: 0.09
Nodes (22): agent_skills, brave_search, commit_docs, exa_search, features, firecrawl, git, branching_strategy (+14 more)

### Community 4 - "GSD Workflow Config"
Cohesion: 0.11
Nodes (21): Git Branching Strategy: none, Granularity: coarse, GSD Project Config, Hooks: Context Warnings Enabled, Execution Mode: yolo, Model Profile: balanced, PLAN.md, PR Section: Success Metrics & Release Criteria (+13 more)

### Community 5 - "Supabase RLS & Migrations"
Cohesion: 0.17
Nodes (16): supabase/migrations/20260521000000_initial.sql, Row-Level Security (RLS) Policy Template, Pitfall: RLS Recursive Policy Performance (initplan caching), Rationale: RLS as Security Boundary (not WHERE predicates), DATA-01: families Table, DATA-02: family_members Table, DATA-03: children Table, DATA-04: family_id NOT NULL on Every Domain Table (+8 more)

### Community 6 - "Security Concerns & Anti-Patterns"
Cohesion: 0.16
Nodes (16): Codebase Concerns & Security Issues, activeTab State Navigation, Anti-Pattern: Client-Side API Key, Security Concern: Default JWT Secret, Anti-Pattern: God Component (App.jsx), Tech Debt: Mock Data in Production (Hassan family), OpenRouter LLM Gateway, TanStack React Query (+8 more)

### Community 7 - "Workflow Automation Settings"
Cohesion: 0.12
Nodes (16): workflow, auto_advance, code_review, code_review_depth, discuss_mode, node_repair, node_repair_budget, nyquist_validation (+8 more)

### Community 8 - "Document API & Auth"
Cohesion: 0.29
Nodes (8): api/documents/index.js and [id].js, lib/auth.js (requireUser helper), lib/db/documents.js, lib/supabase.js (userClient + serviceClient), Two-Client Supabase Setup (userClient + serviceClient), DATA-05: Repository Pattern via lib/db/* Wrappers, DATA-11: server.js Decomposed to api/ Vercel Functions, @supabase/supabase-js 2.106.1

### Community 9 - "Current Tech Stack"
Cohesion: 0.40
Nodes (5): Codebase Stack Analysis, Express 5 Backend, React 19 SPA, Tailwind CSS v4, Vite 8 Build Tool

### Community 10 - "Zod Validation"
Cohesion: 0.50
Nodes (4): D-13: Zod Validates Every Request Body, Pitfall: Zod v4 Breaking Changes, SEC-06: Zod Request Body Validation, zod 4.4.3

## Knowledge Gaps
- **110 isolated node(s):** `model_profile`, `commit_docs`, `parallelization`, `search_gitignored`, `brave_search` (+105 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Envalid Env Validation` connect `Vercel API Functions` to `Document & Reminder Pipeline`, `Email & Env Config`, `Security Concerns & Anti-Patterns`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `Phase 01 Research: Supabase+Vercel Stack` connect `Vercel API Functions` to `Document API & Auth`, `Email & Env Config`, `Supabase RLS & Migrations`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `Plan 01-03: Vercel Serverless Functions & Frontend Auth Swap` connect `Vercel API Functions` to `Document API & Auth`, `Email & Env Config`, `Zod Validation`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **What connects `model_profile`, `commit_docs`, `parallelization` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Document & Reminder Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.07373737373737374 - nodes in this community are weakly interconnected._
- **Should `Vercel API Functions` be split into smaller, more focused modules?**
  _Cohesion score 0.06258890469416785 - nodes in this community are weakly interconnected._
- **Should `Email & Env Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08735632183908046 - nodes in this community are weakly interconnected._