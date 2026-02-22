# Security Hardening and Logging Report

Date: February 22, 2026

## Summary

This document records the security hardening and observability work implemented in this repository.

Implemented outcomes:

- Critical auth bypasses removed.
- Sensitive endpoints protected and behavior tightened.
- Webhook anti-replay protections added.
- Login brute-force protections added.
- Internal error leakage reduced.
- Cookie parsing hardened against malformed input.
- Production CSP tightened.
- Migrations endpoint hardened.
- Postgres connection defaults hardened (`search_path`, timeouts, role GUC).
- RLS policy hardened with a new migration.
- Centralized structured logging with redaction and request IDs added.

## 1. Security Changes Implemented

### 1.1 Auth and Access Control

- Removed `User-Agent`-based bypass for `/api/v1/cargas/check`.
- `/api/v1/cargas/check` now requires `x-admin-key` or valid cron secret.
- `/api/v1/cargas/health` now requires session or admin API key.
- `/api/v1/migrations` now requires admin API key (session alone is no longer enough).

Primary files:

- `apps/api/src/controllers/cargas-controller.ts`
- `apps/api/src/controllers/migrations-controller.ts`
- `apps/api/src/app.test.ts`
- `tests/integration/api/v1/cargas/auth.test.ts`
- `tests/integration/api/v1/cargas/health.test.ts`

### 1.2 Webhook Hardening

- Secret in query string is rejected.
- Secret must be provided via header (`x-cron-secret`).
- Added required timestamp header (`x-cron-timestamp`) and skew validation.
- Added required event id header (`x-cron-id`) and replay protection.
- Added payload size cap for webhook requests.

Primary files:

- `apps/api/src/controllers/cargas-controller.ts`
- `apps/api/src/lib/replay-protection.ts`
- `tests/integration/api/v1/cargas/webhook.test.ts`
- `scripts/verify-webhook.ts`

### 1.3 Authentication Hardening

- Removed implicit `admin/admin` fallback (only enabled if `ALLOW_DEV_DEFAULT_ADMIN=true`).
- Added login request size limit.
- Added in-memory rate limit/lockout for failed login attempts.
- Added `Retry-After` response on lockout.

Primary files:

- `apps/api/src/controllers/auth-controller.ts`
- `apps/api/src/lib/rate-limit.ts`
- `apps/api/src/app.test.ts`

### 1.4 Error Handling and Data Exposure

- Replaced raw exception responses with generic public error messages.
- Kept detailed failures in server logs.
- Status endpoint detail exposure restricted in production unless admin key or explicit override.

Primary files:

- `apps/api/src/controllers/cargas-controller.ts`
- `apps/api/src/controllers/migrations-controller.ts`
- `apps/api/src/controllers/status-controller.ts`
- `packages/shared/src/types/index.ts`

### 1.5 Database / RLS Hardening

- Added secure Postgres connection options defaults:
  - `search_path=public`
  - statement/lock/idle-in-tx timeouts
  - `app.current_role=api`
- Added migration to harden RLS:
  - `FORCE ROW LEVEL SECURITY`
  - replaced permissive policy with role-gated policy using `app.current_role`
  - revoked `PUBLIC` table privileges

Primary files:

- `apps/api/src/infra/database.ts`
- `infra/database.ts`
- `infra/migrations/1772000000000_harden-cargas-rls-and-privileges.js`

## 2. Logging System Added

### 2.1 What Was Added

A centralized structured logger for the Bun API:

- JSON log records.
- Log levels (`debug`, `info`, `warn`, `error`).
- Request ID generation/propagation.
- Sensitive value redaction.
- Error serialization (stack controlled by environment).
- Sensitive key redaction extended for PII-like fields (`phone`, `msisdn`, `cpf`, `cnpj`).

Client/UI logging policy:

- No `console.*` allowed in UI/client code paths (enforced in ESLint).
- UI/client code is blocked from importing server modules/loggers (enforced in ESLint).
- Logging remains server-side only (API, cron, and DB paths).

Primary file:

- `apps/api/src/lib/logger.ts`

### 2.2 Where It Is Used

Integrated into:

- API controllers (`auth`, `cargas`, `migrations`, `status`).
- API services (`cargo-processor`, `tegma-scraper`, `whatsapp-notifier`).
- API startup and cron runner/jobs.
- API DB error paths.

Primary files:

- `apps/api/src/controllers/auth-controller.ts`
- `apps/api/src/controllers/cargas-controller.ts`
- `apps/api/src/controllers/migrations-controller.ts`
- `apps/api/src/controllers/status-controller.ts`
- `apps/api/src/services/cargo-processor.ts`
- `apps/api/src/services/tegma-scraper.ts`
- `apps/api/src/services/whatsapp-notifier.ts`
- `apps/api/src/index.ts`
- `apps/api/src/cron-jobs.ts`
- `apps/api/src/cron-runner.ts`
- `apps/api/src/infra/database.ts`

### 2.3 Logging Environment Variables

Added/documented:

- `LOG_LEVEL` (`debug|info|warn|error`)
- `LOG_INCLUDE_STACK` (`true|false`)

Also relevant security envs documented/updated:

- `ALLOW_DEV_DEFAULT_ADMIN`
- `AUTH_RATE_LIMIT_WINDOW_SECONDS`
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS`
- `AUTH_RATE_LIMIT_BLOCK_SECONDS`
- `CRON_WEBHOOK_MAX_SKEW_SECONDS`
- `STATUS_EXPOSE_DETAILS`
- `ENABLE_DASHBOARD_MIGRATIONS`
- `POSTGRES_OPTIONS` (optional override)

File:

- `.env.example`

## 3. Verification Executed

Commands run successfully:

- `bun x tsc --noEmit`
- `cd apps/api && bun test`
- `bun run test`

Notes:

- Full `bun run test` passed in fallback mode when Docker/Postgres is unavailable.
- DB-backed integration API suites were skipped in this environment due missing Postgres runtime.

## 4. Operational Follow-up

Recommended next operational steps:

1. Run migrations in an environment with Postgres available (including the new RLS migration).
2. Execute DB-backed integration API tests with Postgres up.
3. Set production env values explicitly (`STATUS_EXPOSE_DETAILS=false`, strict `LOG_LEVEL`, strong secrets).
4. If needed for horizontal scaling, replace in-memory replay/rate-limit stores with shared storage (e.g., Redis).
