# Codebase Map, Technical Debt Analysis & Refactor Plan

## Executive Summary

This document provides a comprehensive analysis of the Notifica Frete Guincho na Hora codebase—a Next.js 16 + Elysia (Bun) monorepo for monitoring Tegma/Mills transportation cargo loads and sending WhatsApp notifications.

**Key Findings:**
- 114 source files with layered architecture (controllers → services → repositories)
- 10 critical technical debt hotspots identified
- 3-phase refactor plan with estimated timeline of 2-3 months
- Primary risks: legacy code duplication, no connection pooling, in-memory state preventing horizontal scaling

---

## 1. Main Modules & Responsibilities

### 1.1 Core API Layer (`apps/api/src/`)

| Module | Files | Responsibility |
|--------|-------|----------------|
| **Controllers** | `controllers/*-controller.ts` (5 files) | HTTP request handling, auth checks, caching headers, response formatting |
| **Services** | `services/*` (3 files) | Business logic: scraping, notifications, orchestration |
| **Repositories** | `repositories/cargas-repository.ts` | SQL queries, database access abstraction |
| **Infrastructure** | `infra/database.ts` | PostgreSQL connection management |
| **Libraries** | `lib/*` (8 files) | Cross-cutting concerns: logging, sessions, caching, rate limiting, security |

### 1.2 Frontend Layer (`pages/`, `components/`, `lib/`)

| Module | Files | Responsibility |
|--------|-------|----------------|
| **Pages** | `pages/*.tsx` (11 files) | Next.js pages with SSR auth checks |
| **Components** | `components/*.tsx` (5 files) | React components: Layout, LoadingUI, Toast |
| **Frontend Lib** | `lib/*.ts` (8 files) | API client, session management, SWR config, date formatting |

### 1.3 Shared Package (`packages/shared/`)

| Module | Files | Responsibility |
|--------|-------|----------------|
| **Models** | `models/Carga.ts` | Domain model with validation, WhatsApp formatting |
| **Types** | `types/index.ts` | TypeScript interfaces |
| **API Routes** | `api.ts` | Centralized route definitions |

### 1.4 Legacy Code (Root Level)

| Module | Files | Status |
|--------|-------|--------|
| `services/*` | 3 files | **Legacy duplicates** of `apps/api/src/services/` |
| `repositories/*` | 1 file | **Legacy duplicate** |
| `infra/*` | 3 files | **Legacy duplicates** |

---

## 2. Core Execution/Data Flows

### 2.1 Flow A: Cargo Check Cron Job

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  node-cron      │────▶│ cargo-processor  │────▶│ tegma-scraper   │
│  (7AM-6PM BRT)  │     │  .process()      │     │  .fetchCargas() │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
            ┌──────────────────┐
            │ 1. getCookie()   │  GET /Login (extract cookie)
            │ 2. login()       │  POST /Login (authenticate)
            │ 3. fetchCargas() │  GET /Monitoramento/CargasDisponiveis
            │ 4. parseCargas() │  Cheerio HTML parsing
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐     ┌──────────────────────┐
            │ cargasRepository │────▶│  existsBatch()       │
            │   .save()        │     │  (deduplication)     │
            └────────┬─────────┘     └──────────────────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ whatsappNotifier │────▶ notifyJean() + notifyJefferson()
            │   .send()        │      POST Evolution API /message/sendText
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ markAsNotified() │  UPDATE cargas SET notificado_em
            └──────────────────┘
```

**Entry Points:**
- Cron: `apps/api/src/cron-jobs.ts:9` - runs every 15 minutes, 7AM-6PM BRT
- Manual: `POST /api/v1/cargas/check` - requires admin API key
- Webhook: `POST /api/v1/cargas/webhook` - requires cron secret + timestamp validation

### 2.2 Flow B: Dashboard Data Fetch

```
pages/dashboard.tsx
       │
       ▼
useSWR(["dashboard-cargas", limit, offset])
       │
       ▼
lib/api.ts: fetchDashboardData()
       │
       ├──▶ fetchCargas({ notified: false }) ──┐
       │                                         ├──▶ Parallel (if no pending)
       └──▶ fetchCargas({ notified: undefined })─┘
                    │
                    ▼
         GET /api/v1/cargas?notified=false
                    │
                    ▼
    cargas-controller.ts: cargasIndexHandler()
       │
       ├──▶ Server Cache Check (ETag + in-memory)
       ├──▶ cargasRepository.findNotNotified()
       └──▶ cargasRepository.countNotNotified()
                    │
                    ▼
              PostgreSQL (pg driver)
```

### 2.3 Flow C: Authentication

```
pages/login.tsx ──POST /api/v1/auth/login──▶ auth-controller.ts
                                                    │
                                                    ▼
                                        validate credentials (ADMIN_USERNAME/PASSWORD)
                                                    │
                                                    ▼
                                        rate-limit.ts (check/record failures)
                                                    │
                                                    ▼
                                        session.ts: buildSessionCookie()
                                        (HMAC-SHA256 signed JWT-like)
                                                    │
                                                    ▼
                                        Set-Cookie: cargo_session={payload}.{sig}
```

**Security Features:**
- HMAC-SHA256 signed sessions (`apps/api/src/lib/session.ts:19-24`)
- Rate limiting with exponential backoff (`apps/api/src/lib/rate-limit.ts`)
- Timing-safe comparison for secrets (`apps/api/src/lib/security.ts`)
- Replay protection for webhooks (`apps/api/src/lib/replay-protection.ts`)

---

## 3. Top 10 Technical Debt Hotspots

### #1: Legacy Code Duplication at Root Level

**Files:** `services/*.ts`, `repositories/*.ts`, `infra/*.ts` (root level)

**Evidence:**
- `services/cargo-processor.ts` (131 lines) duplicates `apps/api/src/services/cargo-processor.ts` (127 lines)
- `infra/database.ts` (85 lines) duplicates `apps/api/src/infra/database.ts` (83 lines)
- `infra/cron-jobs.ts` (38 lines) duplicates `apps/api/src/cron-jobs.ts` (33 lines)

**Problem:** Dead code confusion, drift risk, import ambiguity (some files use `infra/database` others `apps/api/src/infra/database`)

**Risk:** Developers modify wrong file, tests run against wrong implementation

---

### #2: In-Memory State Won't Scale

**Files:**
- `apps/api/src/lib/server-cache.ts` (lines 1-80) - Map-based cache
- `apps/api/src/lib/rate-limit.ts` (line 7) - `Map<string, RateLimitState>`
- `apps/api/src/lib/replay-protection.ts` (line 1) - `Map<string, number>`

**Evidence:**
```typescript
const cacheStore = new Map<...>();  // server-cache.ts:1
const authAttempts = new Map<...>(); // rate-limit.ts:7
```

**Problem:** All state is process-local. Horizontal scaling (multiple instances) breaks rate limiting, cache invalidation, and webhook replay protection

**Risk:** Security holes (rate limits bypassed), stale data, duplicate webhook processing in multi-instance deployments

---

### #3: SQL Injection Risk in Repository

**File:** `apps/api/src/repositories/cargas-repository.ts`

**Evidence:** Lines 136-143, 183-190
```typescript
const result = await query({
  text: `
    SELECT ${selectedColumns}        // <-- interpolated
    FROM cargas
    ORDER BY ${orderByClause}        // <-- interpolated
    LIMIT $1 OFFSET $2;
  `,
  values: [limit, offset],
});
```

**Problem:** `selectedColumns` and `orderByClause` are built via string interpolation after "validation"

**Risk:** If `SORTABLE_COLUMNS` or column validation is ever bypassed/buggy, direct SQL injection possible

---

### #4: Duplicate prevColetaOrderExpr

**File:** `apps/api/src/repositories/cargas-repository.ts`

**Evidence:** Lines 123-129 and 170-176 (identical 7-line SQL fragment duplicated)
```typescript
const prevColetaOrderExpr = `
  CASE
    WHEN prev_coleta ~ '^\\d{2}/\\d{2}/\\d{4}$' THEN to_date(prev_coleta, 'DD/MM/YYYY')
    WHEN prev_coleta ~ '^\\d{2}/\\d{2}/\\d{2}$' THEN to_date(prev_coleta, 'DD/MM/YY')
    ELSE NULL
  END
`;
```

**Problem:** Copy-paste code, maintenance burden, drift risk

**Risk:** Fix in one place, forget the other

---

### #5: No Connection Pooling

**File:** `apps/api/src/infra/database.ts`

**Evidence:** Lines 4-22
```typescript
export async function query(...) {
  let client: Client | undefined;
  try {
    client = await getNewClient();  // New Client every time!
    const result = await client.query(queryObject as never);
    return result;
  } finally {
    if (client) {
      await client.end();  // Closes connection
    }
  }
}
```

**Problem:** Creates new connection per query. No `Pool` from `pg`

**Risk:** Connection exhaustion under load, high latency from connection setup/teardown overhead

---

### #6: Hardcoded Recipient Logic

**File:** `apps/api/src/services/cargo-processor.ts`

**Evidence:** Lines 54-80
```typescript
try {
  await whatsappNotifier.notifyJean(carga);
} catch (error) { ... }

try {
  await whatsappNotifier.notifyJefferson(carga);
} catch (error) { ... }
```

**Problem:** Jean and Jefferson are hardcoded. Adding a recipient requires code changes

**Risk:** Not configurable, violates Open/Closed principle

---

### #7: Type Assertion Overuse

**Files:** Multiple

**Evidence:**
```typescript
// apps/api/src/repositories/cargas-repository.ts:50
return result.rows[0]?.exists as boolean;

// apps/api/src/services/cargo-processor.ts:17
return { processed: 0, new_cargas: [] as unknown[] };

// apps/api/src/controllers/cargas-controller.ts:57
return JSON.parse(value) as { processed?: number; ... };
```

**Problem:** `as` assertions bypass type safety. `unknown` used to silence compiler

**Risk:** Runtime errors that TypeScript should catch

---

### #8: No Transaction Boundaries

**File:** `apps/api/src/services/cargo-processor.ts`

**Evidence:** Lines 48-82
```typescript
await cargasRepository.save(carga.toDatabase());     // Save
await whatsappNotifier.notifyJean(carga);            // Notify (external)
await whatsappNotifier.notifyJefferson(carga);       // Notify (external)
await cargasRepository.markAsNotified(carga.id_viagem); // Mark notified
```

**Problem:** If notification succeeds but `markAsNotified` fails, carga stays "unnotified" but recipients already got message. No rollback capability

**Risk:** Data inconsistency, duplicate notifications on retry

---

### #9: Test-Mode Conditional Logic in Production Code

**Files:** Multiple

**Evidence:**
```typescript
// apps/api/src/services/tegma-scraper.ts:8-10, 21-23
function isTest() { return process.env.NODE_ENV === "test"; }
async function withRetry<T>(...) {
  if (isTest()) { return fn(); }  // Skip retries in test
```

```typescript
// apps/api/src/lib/server-cache.ts:6-12
function isCacheEnabled() {
  if (process.env.TEST_MODE === "1") { return false; }
```

**Problem:** Production code has branches that only execute in tests. Tests don't test production paths

**Risk:** Test passes, production fails. Hidden complexity

---

### #10: No Circuit Breaker for External APIs

**File:** `apps/api/src/services/tegma-scraper.ts`, `whatsapp-notifier.ts`

**Evidence:** Retries exist (async-retry with 5 attempts) but no circuit breaker pattern
```typescript
return retry(fn, {
  retries: 5,
  factor: 2,
  minTimeout: 5000,
  maxTimeout: 30000,
```

**Problem:** If Tegma/Evolution API is down, every request waits 5-30s × 5 retries = up to 2.5 min per failure

**Risk:** Cascading failures, request pile-up, degraded service even after external API recovers

---

## 4. Phased Refactor Plan

### Phase 1: Quick Wins (1-2 weeks)

| Task | Files | Effort | Risk |
|------|-------|--------|------|
| **P1.1: Delete Legacy Code** | Root `services/`, `repositories/`, `infra/` | 2-3 days | Low - verify no imports first |
| **P1.2: Extract SQL Fragment** | `cargas-repository.ts` | 2 hours | Low - pure refactor |
| **P1.3: Add Connection Pool** | `apps/api/src/infra/database.ts` | 2-3 days | Medium - requires load testing |
| **P1.4: Fix Type Assertions** | `repositories/cargas-repository.ts`, `cargo-processor.ts` | 1-2 days | Low |

**Validation:**
- Run full test suite: `bun run test`
- Load test: `autocannon -c 50 -d 30 http://localhost:3000/api/v1/status`
- Verify no regressions in DB connection handling

---

### Phase 2: Structural Improvements (1-2 sprints, 4-6 weeks)

| Task | Files | Effort | Risk |
|------|-------|--------|------|
| **P2.1: Implement Repository Pattern with Query Builder** | `repositories/cargas-repository.ts` | 1 week | Medium - SQL changes need testing |
| **P2.2: Abstract Recipient Configuration** | `services/cargo-processor.ts`, `services/whatsapp-notifier.ts` | 3-4 days | Medium - config change |
| **P2.3: Add Transaction Support** | `infra/database.ts`, `services/cargo-processor.ts` | 1 week | High - critical path |
| **P2.4: Extract In-Memory State** | `lib/server-cache.ts`, `lib/rate-limit.ts`, `lib/replay-protection.ts` | 1 week | Medium - Redis dependency |

#### P2.1: Query Builder Implementation

Replace string-interpolated SQL with query builder (e.g., Kysely or pg-promise):

```typescript
// Before (vulnerable)
const result = await query({
  text: `SELECT ${columns} FROM cargas ORDER BY ${orderBy}`
});

// After (safe)
const query = db.selectFrom('cargas')
  .select(columns)  // Type-safe column names
  .orderBy(orderBy, direction);
```

#### P2.2: Configurable Recipients

```typescript
// .env
NOTIFICATION_RECIPIENTS=[{"name":"jean","phone":"5512..."},{"name":"jefferson","phone":"5512..."}]
```

#### P2.3: Transaction Support

```typescript
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
```

#### P2.4: Redis-Backed State

```typescript
// lib/server-cache-redis.ts
export async function getServerCache<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}
```

**Validation:**
- SQL injection tests: `sqlmap` or manual penetration testing
- Transaction tests: Simulate failures at each step
- Redis integration tests: `tests/integration/lib/cache.test.ts`

---

### Phase 3: Resilience & Observability (1-2 months)

| Task | Files | Effort | Risk |
|------|-------|--------|------|
| **P3.1: Circuit Breaker for External APIs** | `services/tegma-scraper.ts`, `services/whatsapp-notifier.ts` | 1 week | Medium |
| **P3.2: Structured Error Handling** | All services | 1 week | Low-Medium |
| **P3.3: Metrics & Alerting** | New `lib/metrics.ts` | 1 week | Low |
| **P3.4: Health Check Enhancement** | `controllers/status-controller.ts` | 3-4 days | Low |

#### P3.1: Circuit Breaker

Use `opossum` or custom circuit breaker:

```typescript
const scraperCircuit = new CircuitBreaker(tegmaScraper.fetchCargas, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

#### P3.2: Structured Errors

```typescript
class TegmaScraperError extends Error {
  constructor(
    message: string,
    public code: 'AUTH_FAILED' | 'TIMEOUT' | 'PARSE_ERROR',
    public retryable: boolean
  ) { super(message); }
}
```

#### P3.3: Metrics Collection

```typescript
// lib/metrics.ts
export const metrics = {
  scraperDuration: new Histogram('tegma_scrape_duration_seconds'),
  notificationFailures: new Counter('whatsapp_notification_failures_total'),
  cacheHitRate: new Gauge('server_cache_hit_rate')
};
```

**Validation:**
- Chaos testing: Fail external APIs, verify circuit breaker opens
- Metrics verification: `curl /metrics` returns Prometheus format
- Dashboard review: All new metrics visible in Grafana

---

## 5. Risk Summary

| Risk | Mitigation |
|------|------------|
| **Breaking changes** | Comprehensive test suite before each phase |
| **Database performance** | Load testing with production-like data volume |
| **Redis dependency** | Graceful degradation (fallback to in-memory with warnings) |
| **External API failures** | Circuit breaker + structured error handling |

---

## 6. Observability Recommendations

1. **Add OpenTelemetry tracing** across service boundaries
2. **Structured logging validation** - ensure all errors include `error.code` and `error.retryable`
3. **Database query logging** - add slow query log (>500ms)
4. **Health check dashboard** - visualize circuit breaker states, cache hit rates, notification success rates

---

## Appendix: File Reference Quick Links

### Critical Files
- API entry: `apps/api/src/index.ts`
- App factory: `apps/api/src/app.ts`
- Cron jobs: `apps/api/src/cron-jobs.ts`
- Database: `apps/api/src/infra/database.ts`
- Logger: `apps/api/src/lib/logger.ts`

### Services
- Cargo processor: `apps/api/src/services/cargo-processor.ts`
- Tegma scraper: `apps/api/src/services/tegma-scraper.ts`
- WhatsApp notifier: `apps/api/src/services/whatsapp-notifier.ts`

### Controllers
- Cargas: `apps/api/src/controllers/cargas-controller.ts`
- Auth: `apps/api/src/controllers/auth-controller.ts`
- Status: `apps/api/src/controllers/status-controller.ts`

### Shared
- Carga model: `packages/shared/src/models/Carga.ts`
- Types: `packages/shared/src/types/index.ts`
- API routes: `packages/shared/src/api.ts`
