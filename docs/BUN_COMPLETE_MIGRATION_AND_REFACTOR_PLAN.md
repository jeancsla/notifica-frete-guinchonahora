# Bun Complete Migration and Refactor Plan

## Goal

Migrate backend runtime from Next.js Node API handlers to Bun-first architecture with strict compatibility (`/api/v1`, auth/cookies, tests, frontend flows), and remove legacy Node API runtime paths in this branch.

## What was changed

### 1. Legacy Next API handlers removed

- Deleted all files under `pages/api/v1/*`.
- Next no longer serves API logic directly.
- `/api/v1/*` is now handled only by Bun API (`apps/api`), proxied by Next rewrites.

### 2. Next routing now Bun-only for API

- Updated `next.config.js` rewrites to always proxy `/api/v1/:path*` to `API_ORIGIN`.
- Rewrites use `beforeFiles` so Bun API wins even if local files exist.
- In production, build now fails fast if `API_ORIGIN` is missing.

### 3. Cookie/session moved to Bun-compatible logic

- Replaced `iron-session` usage in `lib/session.js`.
- Next SSR now validates the same signed `cargo_session` cookie format used by Bun API:
  - HMAC-SHA256 signature
  - payload with `user` and `exp`
  - constant-time signature check
- This preserves server-side auth guards on pages like `/` and `/dashboard`.

### 4. Test stack aligned to Bun API routing

- `test:web` now runs Next + Bun API together and executes integration/UI tests against proxied `/api/v1/*`.
- Bun API test mode enabled in test process (`TEST_MODE=1`) for parity hooks.
- Bun API `cargas` cache is bypassed in test mode to avoid cross-test cache leakage.
- Removed obsolete Jest config files:
  - `jest.config.js`
  - `jest.setup.js`
- Removed obsolete `tests/orchestrator.js` (Bun orchestrator is used).

### 5. Runtime scripts aligned

- `cron` script now executes Bun cron runner in `apps/api/src/cron-runner.ts`.
- Removed `USE_BUN_API` from dev/test command wiring (no dual runtime switch in this branch).
- Updated `.env.development` and `.env.example` accordingly.
- Removed `iron-session` dependency from `package.json`.
- Added startup guard `preflight:dev` to prevent duplicate local runtimes and stale Next lock crashes.
  - Fails fast if ports `3000` (Next) or `4000`/`API_PORT` (Bun API) are already occupied.
  - Cleans stale `.next/dev/lock` only when no local `next dev` process exists.
  - Added `dev:stop` helper to terminate common local dev processes safely.

### 6. CI naming cleanup

- Updated workflow job naming to reflect Bun web/integration testing.

## Why these changes

- Keeping both Next API and Bun API in branch created ambiguous execution and test false-positives.
- Removing `pages/api/v1/*` enforces a single source of truth for backend behavior.
- Sharing cookie verification semantics between Next SSR and Bun API prevents auth drift.
- Forcing rewrites in `beforeFiles` guarantees production-like routing during local tests.

## Verification performed

The following commands were executed successfully after changes:

- `bun run lint`
- `bun run test:all`
- `bun run build`

Key validation points:

- API integration tests now pass while routed through Bun API.
- Auth login/logout/user and protected routes still work with `cargo_session` cookie.
- Frontend pages still call `/api/v1/*` with unchanged contracts.
- Login error handling in dev now returns actionable guidance when default credentials are active (`admin/admin` fallback).

## Current architecture

- Frontend: Next.js pages app (Vercel)
- API: Bun + Elysia in `apps/api`
- Contract path: `/api/v1/*`
- Proxy: Next rewrite -> `API_ORIGIN`
- DB: Postgres with `pg` + `node-pg-migrate`

## Refactor plan (next steps)

### Priority 1: Remove duplicate backend logic

Current duplication still exists between:

- root JS modules:
  - `models/*`
  - `repositories/*`
  - `services/*`
  - `infra/database.js`
- Bun TS modules:
  - `apps/api/src/models/*`
  - `apps/api/src/repositories/*`
  - `apps/api/src/services/*`
  - `apps/api/src/infra/database.ts`

Plan:

1. Move shared domain/data logic to `packages/shared` or `apps/api/src` only.
2. Point tests to Bun TS modules (or compiled output) to eliminate legacy JS paths.
3. Delete root legacy backend JS modules after test migration.

### Priority 2: Consolidate cron runtime

`infra/cron-*.js` still exists as historical code.

Plan:

1. Keep only `apps/api/src/cron-jobs.ts` + `apps/api/src/cron-runner.ts`.
2. Remove legacy `infra/cron-jobs.js` and `infra/cron-runner.js`.
3. Update docs (`docs/CRON_OPTIONS.md`) to Bun-only commands.

### Priority 3: Strengthen config contracts

Plan:

1. Add startup env validation in Bun API (`zod`/schema) for required vars.
2. Enforce `SESSION_SECRET` strength validation.
3. Add a health endpoint check that reports config readiness.

### Priority 4: Tests and observability hardening

Plan:

1. Add contract snapshot tests from frontend perspective (`/api/v1/*` via Next proxy).
2. Add Playwright smoke path for login -> dashboard -> refresh -> webhook/check trigger.
3. Add structured request logging with request-id in Bun API for traceability.

## Operational notes

- `API_ORIGIN` must point to the Bun API deployment in every environment.
- Since legacy Next API handlers were removed, rollback is deployment rollback to prior release, not runtime toggle.
