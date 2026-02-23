/**
 * Prometheus metrics for observability
 */
import { register, Counter, Histogram, Gauge } from "prom-client";

// HTTP request metrics
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Database metrics
export const dbQueriesTotal = new Counter({
  name: "db_queries_total",
  help: "Total database queries",
  labelNames: ["operation"],
});

export const dbQueryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

// Circuit breaker metrics
export const circuitBreakerState = new Gauge({
  name: "circuit_breaker_state",
  help: "Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)",
  labelNames: ["name"],
});

export const circuitBreakerFailures = new Counter({
  name: "circuit_breaker_failures_total",
  help: "Total circuit breaker failures",
  labelNames: ["name"],
});

export const circuitBreakerSuccesses = new Counter({
  name: "circuit_breaker_successes_total",
  help: "Total circuit breaker successes",
  labelNames: ["name"],
});

// Business logic metrics
export const cargasProcessedTotal = new Counter({
  name: "cargas_processed_total",
  help: "Total cargas processed",
  labelNames: ["result"],
});

export const notificationsTotal = new Counter({
  name: "notifications_total",
  help: "Total notifications sent",
  labelNames: ["recipient", "status"],
});

export const tegmaScrapeDuration = new Histogram({
  name: "tegma_scrape_duration_seconds",
  help: "Tegma scrape duration in seconds",
  buckets: [0.5, 1, 2.5, 5, 10, 30, 60],
});

// Rate limiting metrics
export const rateLimitBlocksTotal = new Counter({
  name: "rate_limit_blocks_total",
  help: "Total rate limit blocks",
  labelNames: ["endpoint"],
});

// Cache metrics
export const cacheHitsTotal = new Counter({
  name: "cache_hits_total",
  help: "Total cache hits",
  labelNames: ["cache_type"],
});

export const cacheMissesTotal = new Counter({
  name: "cache_misses_total",
  help: "Total cache misses",
  labelNames: ["cache_type"],
});

/**
 * Get Prometheus metrics in text format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get content type for Prometheus metrics
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  status: number,
  durationSeconds: number,
): void {
  httpRequestsTotal.inc({ method, route, status: String(status) });
  httpRequestDuration.observe({ method, route }, durationSeconds);
}

/**
 * Record database query metrics
 */
export function recordDbQuery(
  operation: string,
  durationSeconds: number,
): void {
  dbQueriesTotal.inc({ operation });
  dbQueryDuration.observe({ operation }, durationSeconds);
}

/**
 * Update circuit breaker state gauge
 */
export function setCircuitBreakerState(
  name: string,
  state: "CLOSED" | "OPEN" | "HALF_OPEN",
): void {
  const stateValue = state === "CLOSED" ? 0 : state === "OPEN" ? 1 : 2;
  circuitBreakerState.set({ name }, stateValue);
}

/**
 * Record circuit breaker result
 */
export function recordCircuitBreakerResult(
  name: string,
  success: boolean,
): void {
  if (success) {
    circuitBreakerSuccesses.inc({ name });
  } else {
    circuitBreakerFailures.inc({ name });
  }
}

/**
 * Record carga processing
 */
export function recordCargaProcessed(
  result: "success" | "failed" | "duplicate",
): void {
  cargasProcessedTotal.inc({ result });
}

/**
 * Record notification
 */
export function recordNotification(
  recipient: string,
  status: "success" | "failed",
): void {
  notificationsTotal.inc({ recipient, status });
}

/**
 * Record rate limit block
 */
export function recordRateLimitBlock(endpoint: string): void {
  rateLimitBlocksTotal.inc({ endpoint });
}

/**
 * Record cache hit/miss
 */
export function recordCacheAccess(cacheType: string, hit: boolean): void {
  if (hit) {
    cacheHitsTotal.inc({ cache_type: cacheType });
  } else {
    cacheMissesTotal.inc({ cache_type: cacheType });
  }
}
