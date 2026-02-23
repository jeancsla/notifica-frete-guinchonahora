# Codebase Map, Technical Debt Hotspots, and Refactor Plan

## 1) Codebase Map

### Main modules and responsibilities

1. **Web app (Next.js pages router)**

- `pages/*.tsx`: dashboard/login/status/activity/profile/settings screens.
- `components/*`: shared layout, loading UI, toast, route loading bar.
- `lib/*`: API clients, session parsing, activity/date helpers, SWR defaults.

2. **API app (Bun + Elysia)**

- `apps/api/src/app.ts`: API route registration.
- `apps/api/src/controllers/*`: HTTP handlers and request-level policy.
- `apps/api/src/services/*`: scraper, cargo processing, WhatsApp notifier.
- `apps/api/src/repositories/*`: SQL access layer.
- `apps/api/src/lib/*`: logging, security, session, cache, replay/rate-limit helpers.
- `apps/api/src/infra/*`: database connectivity.

3. **Bridge layer (monodeploy)**

- `app/api/v1/[...all]/route.ts`: forwards all `/api/v1/*` verbs to Elysia app in-process.

4. **Shared contracts**

- `packages/shared/src/*`: route constants, shared types, shared `Carga` model.

5. **Infra and tests**

- `infra/migrations/*`: DB schema + hardening migrations.
- `infra/*`: docker compose and helper scripts.
- Tests: `tests/unit`, `tests/ui`, `tests/integration`, plus API-local tests in `apps/api/src/*.test.ts`.

### Core execution and data flows

1. **Request flow (UI to DB)**

- Browser page -> `lib/api.ts` -> `/api/v1/*` -> Next bridge (`app/api/v1/[...all]/route.ts`) -> Elysia router (`apps/api/src/app.ts`) -> controller -> repository -> Postgres.

2. **Auth/session flow**

- `pages/login.tsx` posts credentials -> `apps/api/src/controllers/auth-controller.ts` validates -> signed cookie from `apps/api/src/lib/session.ts` -> protected handlers gate with `getSessionUser`.

3. **Cargo ingestion flow**

- Manual check / webhook / cron -> `apps/api/src/controllers/cargas-controller.ts` -> `apps/api/src/services/cargo-processor.ts` -> `apps/api/src/services/tegma-scraper.ts` -> repository save/dedupe -> notifier -> mark notified.

4. **Status/health flow**

- `/api/v1/status` and `/api/v1/cargas/health` query DB, apply cache/ETag, and serve dashboard/status/activity screens.

---

## 2) Top 10 Technical Debt Hotspots

Each hotspot includes evidence and impact.

### 1. DB connection churn (no pooling)

- **Evidence:** `apps/api/src/infra/database.ts` and `infra/database.ts` create/connect/end a new `pg.Client` per query.
- **Why this is a problem:** higher latency and risk of exhausting DB connections under concurrency.

### 2. Dual backend implementations drifting

- **Evidence:** production path uses `apps/api/src/services/*` and `apps/api/src/repositories/*`; tests still heavily import root `services/*` and `repositories/*` (for example `tests/integration/services/cargo-processor.test.ts`, `tests/integration/repositories/cargas-repository.test.ts`).
- **Why this is a problem:** tests can pass while production code regresses.

### 3. Monolithic controller logic in `/cargas`

- **Evidence:** `apps/api/src/controllers/cargas-controller.ts` (`cargasIndexHandler`) mixes auth, validation, caching, ETag, pagination, repo queries, and error mapping in one large function.
- **Why this is a problem:** hard to change safely and hard to test in isolation.

### 4. Non-atomic cargo processing

- **Evidence:** `apps/api/src/services/cargo-processor.ts`: save -> notify -> mark notified in separate calls, no transaction/outbox.
- **Why this is a problem:** partial failures can leave inconsistent state.

### 5. “Notified” can be set even after notification failures

- **Evidence:** in `apps/api/src/services/cargo-processor.ts`, notification errors are captured, but `markAsNotified` still executes.
- **Why this is a problem:** data quality issue; records may indicate notified when delivery failed.

### 6. Scraper is fragile under external instability

- **Evidence:** `apps/api/src/services/tegma-scraper.ts` logs in every run; retries exist but no explicit abort timeout control on fetch calls.
- **Why this is a problem:** long hangs and upstream sensitivity (rate limits / temporary outages).

### 7. Critical state is in-memory only

- **Evidence:** replay protection map (`apps/api/src/lib/replay-protection.ts`), auth rate limit map (`apps/api/src/lib/rate-limit.ts`), server cache map (`apps/api/src/lib/server-cache.ts`).
- **Why this is a problem:** state resets on restart and is inconsistent across multiple instances.

### 8. Integration coverage can silently disappear

- **Evidence:** readiness flags set in `tests/bun.setup.ts`; suites use `describe.skip` gates (for example `tests/integration/api/v1/cargas/get.test.ts`, `tests/integration/repositories/cargas-repository.test.ts`).
- **Why this is a problem:** false-green runs if infra is unavailable.

### 9. Scripts tolerate infra failures and continue

- **Evidence:** `package.json` scripts (`dev`, `dev:web`, `test:web:auto`) print “skipping…” and keep going when Postgres/Docker are unavailable.
- **Why this is a problem:** weak signal; developers/CI can miss real environment failures.

### 10. Operational fields stored as strings

- **Evidence:** migration `infra/migrations/1771215067202_create-cargas-table.js` defines date/money-like fields as `varchar`; repository performs regex/to_date parsing for sorting in `apps/api/src/repositories/cargas-repository.ts`.
- **Why this is a problem:** brittle querying, weaker indexing, avoidable parsing complexity.

---

## 3) Phased Refactor Plan

## Quick wins (1-2 weeks)

1. **Fail fast when integration prerequisites are missing**

- Remove or tighten skip-by-default behavior in CI.
- **Effort:** 2-3 days
- **Risk:** Medium (initial CI breakage may surface hidden issues)
- **Validation:** CI must fail if integration prerequisites are absent; track skipped test count.

2. **Fix migration action UX/auth mismatch**

- Align `pages/dashboard.tsx` migration button with API auth requirement (`x-admin-key`) or remove from non-admin UI.
- **Effort:** 0.5-1 day
- **Risk:** Low
- **Validation:** UI + integration tests for expected 401/200 flows.

3. **Add explicit timeout controls to external calls**

- Add request abort/timeout wrappers for scraper/notifier network calls.
- **Effort:** 1-2 days
- **Risk:** Low
- **Validation:** service tests covering timeout/retry behavior; structured logs with timeout reason.

## 1-2 sprints

1. **Eliminate duplicated backend code paths**

- Consolidate to one canonical implementation (prefer `apps/api/src/*`), migrate tests/imports accordingly.
- **Effort:** 5-8 days
- **Risk:** Medium
- **Validation:** all tests execute against canonical path; compare pass/fail matrix before/after.

2. **Introduce DB pooling and query instrumentation**

- Replace per-query `Client` lifecycle with `pg.Pool`.
- **Effort:** 3-5 days
- **Risk:** Medium
- **Validation:** benchmark p95 latency and open-connection metrics before/after.

3. **Decompose `cargas-controller`**

- Split into request schema/parsing, application service, and response serializer.
- **Effort:** 4-6 days
- **Risk:** Medium
- **Validation:** route contract tests + unit tests for parsing/service paths.

4. **Harden processing consistency**

- Add transaction/outbox policy and strict notification success semantics before `notificado_em` update.
- **Effort:** 4-7 days
- **Risk:** Medium/High
- **Validation:** integration tests for partial failures and retry scenarios.

## 1-2 months

1. **Schema normalization and migration backfill**

- Replace string-typed operational fields with typed columns (timestamp/numeric/enums where appropriate).
- **Effort:** 2-3 weeks
- **Risk:** High (data migration)
- **Validation:** staged backfill + dual-read checks + rollback rehearsal + query plan comparison.

2. **Externalize runtime shared state**

- Move replay/rate-limit/cache to Redis (or equivalent) with TTLs and bounded keys.
- **Effort:** 1-2 weeks
- **Risk:** Medium/High
- **Validation:** multi-instance tests; replay/rate-limit behavior consistent across restarts and nodes.

3. **Observability baseline and alerts**

- Instrument cron health, scraper duration, notification failures, DB saturation, and skipped tests.
- **Effort:** 1-2 weeks
- **Risk:** Low/Medium
- **Validation:** dashboards + alert test drills + SLO thresholds.

---

## 4) Validation Strategy (Tests + Observability)

### Tests

- Add controller-level unit tests for request validation and auth branches.
- Add service tests for timeout/retry and partial-failure semantics.
- Keep integration tests mandatory in CI (no silent skip fallback).
- Add contract tests to assert UI/API shape compatibility for `cargas`, `status`, and auth endpoints.

### Observability

- Structured logs with correlation/request IDs already exist; extend with operation outcome labels.
- Add metrics:
  - `db_query_duration_ms` (histogram)
  - `db_open_connections` (gauge)
  - `scraper_fetch_duration_ms` and `scraper_failures_total`
  - `notification_attempts_total` / `notification_failures_total`
  - `webhook_replay_rejected_total`
  - `integration_tests_skipped_total`
- Add alerts on sustained scraper failures, elevated DB saturation, and high notification failure rate.

---

## 5) Suggested Delivery Order

1. Fail-fast test/CI behavior + remove coverage ambiguity.
2. Consolidate duplicate backend paths to one canonical source.
3. Implement DB pooling + controller decomposition.
4. Add processing consistency safeguards (transaction/outbox semantics).
5. Execute schema normalization + distributed state + full observability rollout.
