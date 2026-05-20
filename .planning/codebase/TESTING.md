# Testing Patterns

**Analysis Date:** 2026-05-20

## Test Framework

**None. This project has no automated tests.**

A full filesystem scan for `*.test.*` and `*.spec.*` files under the project root (excluding `node_modules`) returned zero results. `package.json` declares no test runner — neither in `dependencies` nor `devDependencies` — and has no `test` script:

```json
"scripts": {
  "dev": "concurrently \"vite\" \"node server/server.js\"",
  "server": "node server/server.js",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

There is no Jest, Vitest, Mocha, Playwright, Cypress, React Testing Library, supertest, or any other testing dependency installed.

**Runner:** Not configured.
**Assertion Library:** None.
**Config files:** None (`jest.config.*`, `vitest.config.*`, `playwright.config.*` all absent).

**Run Commands:**

```bash
# No test command exists. Running `npm test` will fail with:
#   npm error Missing script: "test"
```

The only quality gate today is ESLint:

```bash
npm run lint          # eslint . — lints all .js/.jsx files
npm run build         # vite build — surfaces bundling/syntax issues
```

## Test File Organization

Not applicable. No test directory (`__tests__/`, `tests/`, `test/`, `e2e/`, `spec/`) exists at any level of the repository.

## Test Structure

Not applicable.

## Mocking

Not applicable. Note that the application source itself contains **mock data fixtures** baked into `src/App.jsx` — `INITIAL_DOCUMENTS`, `INITIAL_EMAILS`, `FAMILY_MEMBERS` (`src/App.jsx:9-30`) — and a runtime canvas-based mock document generator `generateMockDocumentImage(type)` (`src/App.jsx:401`). These are demo/seed data for the running app, **not** test fixtures.

## Fixtures and Factories

None for testing. Demo seed data lives inline in `src/App.jsx` as described above.

## Coverage

**Requirements:** None enforced.
**Current coverage:** 0% — there are no tests to measure.
**View Coverage:** Not applicable.

## Test Types

**Unit Tests:** None.
**Integration Tests:** None.
**E2E Tests:** None.
**API contract tests:** None — Express routes in `server/server.js` are validated only by manual use of the React client.

## Recommended Setup (when adding tests)

When the team decides to add tests, the natural fit for this stack is:

- **Vitest** for unit + component tests — already aligned with Vite (`vite@^8`), zero extra config.
- **@testing-library/react** + **@testing-library/jest-dom** for the React 19 client.
- **supertest** for hitting Express 5 routes directly without spinning up a port.
- **Playwright** if/when end-to-end coverage of the auth → document → AI scan flow is needed.

Suggested file convention to introduce: co-locate `*.test.jsx` next to the source file (`src/App.test.jsx`) and `*.test.js` next to server modules (`server/server.test.js`). Add a `test` and `test:watch` script to `package.json` and wire `npm run lint && npm test` into any CI step before merging.

Until then, **every change to this codebase is unverified by automated tests** — manual verification through `npm run dev` is the only safety net. Treat refactors of `src/App.jsx` (3,643 lines, single component) with extra care.

---

*Testing analysis: 2026-05-20*
