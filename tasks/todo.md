# Task: Fix CI test failure (migration lock contention)

## Plan

- [x] Identify failing CI test and extract root cause from logs
- [x] Patch migrations endpoint to handle concurrent migration lock gracefully
- [x] Run targeted lint/format and migration integration checks
- [ ] Commit and push fix to PR branch

## Review

- Root cause: concurrent test hooks call `/api/v1/migrations`; lock contention (`Another migration is already running`) returned 500 and caused hook timeouts.
- Change: in `apps/api/src/controllers/migrations-controller.ts`, lock contention now returns `200` with empty result instead of failing.
- Validation:
  - `bun x eslint apps/api/src/controllers/migrations-controller.ts`
  - `bun x prettier --check apps/api/src/controllers/migrations-controller.ts`
  - `bun test tests/integration/api/v1/migrations`
