# Codebase Map, Technical Debt Analysis & Unified Refactor Plan

## Executive Summary

This document provides a comprehensive, unified analysis of the Notifica Frete Guincho na Hora codebase—a Next.js 16 + Elysia (Bun) monorepo for monitoring Tegma/Mills transportation cargo loads and sending WhatsApp notifications. It synthesizes insights from previous analyses into a single source of truth for upcoming refactoring efforts.

**Key Findings:**

- **Codebase Scale:** Over 100 source files spanning Web (Next.js), API (Elysia/Bun), and Shared layers.
- **Top Technical Debts:** 14 distinct hotspots identified, spanning architecture, code quality, reliability, security, and testing.
- **Refactor Plan:** A phased, 3-step refactor plan with an estimated timeline of 2-3 months to systematically pay down technical debt while ensuring stability.
- **Primary Risks:** Legacy code duplication, lack of database connection pooling, in-memory state preventing horizontal scaling, and non-atomic external integrations.

---

## 1. Codebase Map & Responsibilities

### 1.1 Core API Layer (`apps/api/src/` & `infra/`)

- **Controllers** (`controllers/*`): HTTP request handling, auth checks, caching headers, route-level policies, response formatting.
- **Services** (`services/*`): Business logic, including the Tegma scraper, cargo processing, and WhatsApp notification orchestration.
- **Repositories** (`repositories/*`): SQL query execution and database access abstraction.
- **Infrastructure** (`infra/*`): PostgreSQL connection management, Docker compose scripts, and schema migrations.
- **Libraries** (`lib/*`): Cross-cutting concerns such as logging, secure session management, caching, rate limiting, and replay protection.

### 1.2 Web & Frontend Layer (`pages/`, `components/`, `app/`)

- **Pages** (`pages/*.tsx`): Next.js Pages router for dashboard, login, status, activity, profile, and settings screens (with SSR auth checks).
- **Components** (`components/*`): Shared React UI elements (Layout, LoadingUI, Toast, etc.).
- **Frontend Lib** (`lib/*`): API clients, session parsing helpers, SWR defaults, and date utilities.
- **Bridge Layer** (`app/api/v1/[...all]/route.ts`): Forwards `/api/v1/*` requests to the Elysia app in-process.

### 1.3 Shared Contracts (`packages/shared/`)

- **Models & Types**: Domain models (e.g., `Carga.ts`) with validation and typing.
- **API Routes**: Centralized route definitions used by both frontend and backend.

### 1.4 Legacy Code (Root Level)

- **Duplicate Backend implementations**: The root `services/`, `repositories/`, and `infra/` directories currently contain legacy duplicates of the `apps/api/src/` code. This is a major source of confusion and drift.

---

## 2. Core Execution & Data Flows

### 2.1 Cargo Ingestion Flow (Cron & Manual)

1. **Trigger:** `node-cron` (7AM-6PM BRT), Manual web trigger, or Webhook.
2. **Scraping:** `TegmaScraper` authenticates, extracts cookies, and parses HTML.
3. **Database:** `CargasRepository` dedupes and saves new loads.
4. **Notification:** `WhatsappNotifier` sends messages via Evolution API.
5. **Finalization:** `CargasRepository` marks as notified.

### 2.2 Dashboard Data Fetch

1. UI Page (`pages/dashboard.tsx`) calls `useSWR`.
2. Request hits `/api/v1/cargas` -> Controller applies caching/ETag.
3. Controller retrieves data from `CargasRepository.findNotNotified()`.
4. Returns serialized JSON.

### 2.3 Authentication Flow

1. UI Posts credentials to `/api/v1/auth/login`.
2. Auth Controller validates against admin configuration.
3. Rate limting (`rate-limit.ts`) ensures brute force protection.
4. `session.ts` signs a JWT-like cookie (HMAC-SHA256).
5. Subsequent requests are gated via session extraction.

---

## 3. Technical Debt Hotspots (Consolidated)

To effectively tackle tech debt, issues have been grouped by domain:

### Architecture & Scaling

1. **In-Memory State Won't Scale:** Rate limiters, server caches, and replay protections rely on Node `Map` inside the process. A multi-instance setup would break security and caching behavior.
2. **No DB Connection Pooling:** `apps/api/src/infra/database.ts` creates, connects, and drops a new `pg.Client` per query, adding immense latency and risking connection exhaustion under load.

### Code Quality & Maintainability

3. **Dual Backend Implementations Drifting:** Production path operates under `apps/api/src/*`, while some tests and root folders still utilize legacy codebase variants, creating a drift risk.
4. **Monolithic Controller Logic:** `cargas-controller.ts` mixes auth, validation, caching, ETags, pagination, and SQL execution parsing, violating Single Responsibility patterns.
5. **Duplicate SQL Fragments & Type Overuse:** String-interpolated SQL exists with duplicated logic (e.g., `prevColetaOrderExpr`), alongside heavy usage of `as unknown` or `as boolean` assertions, weakening TypeScript guarantees.
6. **Hardcoded Configurations:** Notification recipients and operational behaviors are hardcoded deep in logic (`whatsappNotifier.notifyJean()`).

### Reliability & Transactionality

7. **Non-Atomic Cargo Processing:** Saving, notifying, and marking notified happen sequentially without transactional rollback or an Outbox pattern.
8. **"Notified" Status Desync:** Even after notification failures, `markAsNotified` executes, breaking data consistency.
9. **Scraper Fragility & No Circuit Breaker:** Repeated authentication and network requests lack bounded abort timeouts and do not have a circuit breaker, making upstream instability cascade into internal hangs.
10. **Scripts Tolerate Infra Failures:** CLI scripts (`dev`, `test`) ignore DB/Docker unavailabilities, resulting in hidden infrastructure degradation and false positives.

### Security & Data Integrity

11. **SQL Injection Risk:** Columns and ordering clauses are built via string interpolation in the repository layer.
12. **Test-Mode Logic in Production:** Branch logic (`process.env.TEST_MODE`) alters caching, mocking, and error handling in the production artifact.
13. **Suboptimal Data Types:** Important operational fields are stored as `varchar` rather than temporal/numeric types, complicating queries.

### Testing

14. **Integration Coverage Can Disappear:** Test suites bypass execution (`describe.skip`) based on environmental flags without failing the build, allowing the CI to turn green even if critical flows are untested.

---

## 4. Phased Refactor Plan

### Phase 1: Quick Wins & Cleanup (Weeks 1-2)

**Goal:** Establish a sound foundation, fix CI behavior, and remove severe drift risks.

- [ ] **P1.1: Fail-fast CI:** Remove skip-by-default behavior in integration tests and scripts. CI should explicitly fail if dependencies are missing.
- [ ] **P1.2: Delete Legacy Code:** Completely eliminate root-level `services/`, `repositories/`, and `infra/` to consolidate into a single source of truth in `apps/api/src/`. Fix all related imports.
- [ ] **P1.3: External API Timeouts:** Implement strict abort signals and explicit timeouts for the scraper and WhatsApp notifier.
- [ ] **P1.4: Fix DB Connections:** Implement `pg.Pool` instead of `pg.Client` creation to optimize latency.
- [ ] **P1.5: Fix Minor Security and Types:** Remove `as` type assertions, extract raw SQL fragments to prevent duplication. Protect auth/migration UI routes clearly.

### Phase 2: Structural & Transactional Safety (Weeks 3-6)

**Goal:** Guarantee transactional consistency and decouple monolithic components.

- [ ] **P2.1: Decompose Controllers:** Refactor `cargas-controller.ts` by splitting into route schema validation, business service rules, and serialization.
- [ ] **P2.2: Implement Safe Querying:** Refactor `cargas-repository.ts` to utilize a Query Builder (e.g., Kysely) to eliminate SQL injection risks.
- [ ] **P2.3: Transaction & Consistency Guards:** Implement the Outbox pattern and wrap the processing logic in database transactions. Ensure `markAsNotified` does not run if the notification actually fails.
- [ ] **P2.4: Abstract Configurations:** Move hardcoded recipient and external settings into environment variables or a DB-backed configuration table.

### Phase 3: Scaling, Normalization & Observability (Months 2-3)

**Goal:** Prepare for horizontal scaling, optimize data, and establish robust monitoring.

- [ ] **P3.1: Externalize Shared State:** Move in-memory rate-limiting, deduplication, and cache maps to a Redis (or database) backend to support multiple API instances safely.
- [ ] **P3.2: Circuit Breakers:** Introduce circuit breaker thresholds for Tegma/Evolution API integrations.
- [ ] **P3.3: Schema Normalization & Backfill:** Migrate `varchar` operational fields to appropriate Postgres types (`timestamp`, `numeric`) via a staged migration strategy.
- [ ] **P3.4: Deep Observability:** Add structured error logging, latency histograms (`db_query_duration_ms`), and clear alerting logic, removing any remaining test-mode logic from production paths.

---

## 5. Validation & Delivery Strategy

### Validation Checklist

- **Unit/Contract Tests:** Ensure robust, test-driven guarantees over new decoupled application services.
- **Integration Assurance:** Validate transactions using partial-failure simulations (e.g., mock the WhatsApp API to fail, verifying the DB unrolls correctly).
- **Load Testing:** Benchmark endpoints endpoints heavily before and after DB pooling and Query Builder implementation to confirm latency reductions.
- **Data Integrity:** Dual-read checks and rollout rehearsing for the schema normalization in Phase 3.

### Recommended Tooling & Next Steps

- Implement **Prometheus + Grafana** for metrics based on Phase 3.
- Use **Autocannon** for stress and load testing immediately following Phase 1 (`pg.Pool`).
- Begin work on **Phase 1** next, assigning specific files and tests for updating.
