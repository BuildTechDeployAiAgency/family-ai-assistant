# Phase 02 Context: Expo Native Client

**Created:** 2026-06-02
**Decision:** Replace Phase 2 "Frontend Modularization" (web SPA cleanup) with Expo native mobile client.

## Why Expo Instead of Web Modularization

The Vite/React web SPA is a working POC. The goal shifted: get real family users testing on **phones** ASAP, not perfecting the web codebase. Expo ships iOS + Android + Web from one codebase. The Vercel `api/` backend is stateless and already designed for any client.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Expo SDK 52+ with Expo Router v4 | File-based routing, native tabs, works in Expo Go without EAS |
| TypeScript throughout | Type safety on API response shapes from day 1 |
| `mobile/` subdirectory | Keeps existing web app intact; backend `api/` shared |
| Supabase JS SDK (mobile) | Same SDK, different client — `createClient` with Expo SecureStore |
| No EAS Build for MVP | Expo Go QR code = instant testing, no App Store needed |
| `expo-document-picker` + `expo-camera` | Document scan/upload without native build |
| GLM + Kimi for implementation | Orchestrator delegates code generation to GLM/Kimi via MCP model-delegation |
| QA stage (Plan 02-04) | Device testing + regression before Phase 03 starts |

## Stack for This Phase

```
mobile/
  app/
    _layout.tsx           # Root: Supabase session + Expo Router
    (auth)/
      login.tsx
      register.tsx
    (app)/
      _layout.tsx         # Tab navigator
      documents/
        index.tsx         # Document list
        [id].tsx          # Document detail + expiry
        scan.tsx          # Upload via camera or file picker
      school/
        index.tsx         # Per-child task list
      actions/
        index.tsx         # All pending actions/reminders
  lib/
    supabase.ts           # createClient with SecureStore token persistence
    auth.ts               # useSession hook, signIn, signOut, signUp
    api/
      documents.ts        # Typed wrappers over Vercel /api/documents/*
      tasks.ts
      school.ts
  components/
    DocumentCard.tsx
    TaskCard.tsx
    ChildBadge.tsx
    ExpiryBadge.tsx
  constants/
    colors.ts             # Design tokens
```

## Model Delegation Protocol

Executor uses MCP `model-delegation` tools for code generation tasks:
- `ask_glm` — TypeScript component scaffolding, API integration code
- `ask_kimi` — Complex logic (auth flows, data hooks, state management)
- Orchestrator (Claude Sonnet) — Plan verification, QA analysis, architectural decisions

Prompt format for delegation:
```
ask_glm/ask_kimi: "Write [file] for Family AI Assistant Expo app. 
Context: [relevant schema/API shape]. 
Output: production-ready TypeScript only, no explanation."
```

## Phase 01 Dependency

Phase 02 CANNOT start until:
- Plan 01-01 checkpoint resolved (services provisioned)
- Plan 01-02 done (Supabase schema + RLS live)
- Plan 01-03 done (Vercel api/ functions deployed)

The mobile app calls the live Vercel endpoints. No mocking.

## Timeline

| Plan | Name | Est. |
|------|------|------|
| 02-01 | Expo Foundation + Auth | Days 1-2 |
| 02-02 | Document Vault Screens | Days 3-5 |
| 02-03 | School Hub + Actions | Days 6-8 |
| 02-04 | QA + Expo Go Distribution | Days 9-14 |

## Graphify Memory

Run `/graphify mobile/ --update` after each plan to keep the knowledge graph current.
Graph lives at: `graphify-out/graph.json`
