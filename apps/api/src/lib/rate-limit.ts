import { logger } from "./logger";
import { getRedisClient, isRedisEnabled } from "./redis-client";

const log = logger.child({ component: "rate_limit" });

type RateLimitState = {
  attempts: number;
  windowStartMs: number;
  blockedUntilMs: number;
};

// In-memory fallback
const authAttempts = new Map<string, RateLimitState>();

function getWindowMs() {
  return Math.max(
    1_000,
    parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS || "600", 10) * 1_000,
  );
}

function getMaxAttempts() {
  return Math.max(
    1,
    parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || "5", 10),
  );
}

function getBlockMs() {
  return Math.max(
    1_000,
    parseInt(process.env.AUTH_RATE_LIMIT_BLOCK_SECONDS || "900", 10) * 1_000,
  );
}

function getCacheKey(key: string): string {
  return `rate_limit:${key}`;
}

async function getStateFromRedis(key: string): Promise<RateLimitState | null> {
  if (!isRedisEnabled()) return null;

  try {
    const client = await getRedisClient();
    const value = await client.get(getCacheKey(key));
    if (value) {
      return JSON.parse(value) as RateLimitState;
    }
  } catch (error) {
    log.warn("rate_limit.redis_get_failed", { key, error });
  }
  return null;
}

async function setStateInRedis(
  key: string,
  state: RateLimitState,
  ttlSeconds: number,
): Promise<void> {
  if (!isRedisEnabled()) return;

  try {
    const client = await getRedisClient();
    await client.set(getCacheKey(key), JSON.stringify(state), ttlSeconds);
  } catch (error) {
    log.warn("rate_limit.redis_set_failed", { key, error });
  }
}

async function deleteStateFromRedis(key: string): Promise<void> {
  if (!isRedisEnabled()) return;

  try {
    const client = await getRedisClient();
    await client.del(getCacheKey(key));
  } catch (error) {
    log.warn("rate_limit.redis_delete_failed", { key, error });
  }
}

function cleanupExpired(nowMs: number) {
  for (const [key, state] of authAttempts.entries()) {
    const windowExpired = nowMs - state.windowStartMs > getWindowMs();
    const blockExpired = state.blockedUntilMs <= nowMs;
    if (windowExpired && blockExpired) {
      authAttempts.delete(key);
    }
  }
}

export async function getAuthRateLimitState(key: string, nowMs = Date.now()) {
  cleanupExpired(nowMs);

  // Try Redis first
  const redisState = await getStateFromRedis(key);
  if (redisState) {
    // Check if block is still active
    if (redisState.blockedUntilMs > nowMs) {
      return {
        blocked: true,
        retryAfterSeconds: Math.ceil(
          (redisState.blockedUntilMs - nowMs) / 1_000,
        ),
      };
    }
    // Check if window expired in Redis
    if (nowMs - redisState.windowStartMs > getWindowMs()) {
      return { blocked: false, retryAfterSeconds: 0 };
    }
  }

  // Fallback to memory
  const state = authAttempts.get(key);
  if (!state) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (state.blockedUntilMs > nowMs) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((state.blockedUntilMs - nowMs) / 1_000),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export async function recordAuthFailure(key: string, nowMs = Date.now()) {
  cleanupExpired(nowMs);

  const windowMs = getWindowMs();
  const maxAttempts = getMaxAttempts();
  const blockMs = getBlockMs();

  // Try Redis first
  if (isRedisEnabled()) {
    const existing = await getStateFromRedis(key);

    if (!existing || nowMs - existing.windowStartMs > windowMs) {
      const newState: RateLimitState = {
        attempts: 1,
        windowStartMs: nowMs,
        blockedUntilMs: 0,
      };
      await setStateInRedis(key, newState, Math.ceil(windowMs / 1000));
      return;
    }

    const attempts = existing.attempts + 1;
    const blockedUntilMs = attempts >= maxAttempts ? nowMs + blockMs : 0;

    await setStateInRedis(
      key,
      {
        attempts,
        windowStartMs: existing.windowStartMs,
        blockedUntilMs,
      },
      Math.ceil((blockedUntilMs > nowMs ? blockMs : windowMs) / 1000),
    );
    return;
  }

  // Fallback to memory
  const existing = authAttempts.get(key);

  if (!existing || nowMs - existing.windowStartMs > windowMs) {
    authAttempts.set(key, {
      attempts: 1,
      windowStartMs: nowMs,
      blockedUntilMs: 0,
    });
    return;
  }

  const attempts = existing.attempts + 1;
  const blockedUntilMs = attempts >= maxAttempts ? nowMs + blockMs : 0;

  authAttempts.set(key, {
    attempts,
    windowStartMs: existing.windowStartMs,
    blockedUntilMs,
  });
}

export async function clearAuthFailures(key: string) {
  await deleteStateFromRedis(key);
  authAttempts.delete(key);
}

export function resetAuthRateLimitState() {
  authAttempts.clear();
}

// Global rate limiting (by IP only, for spray attack prevention)
const globalAttempts = new Map<string, RateLimitState>();
const MAX_RATE_LIMIT_ENTRIES = 50000; // PERF-5: Prevent memory leak

function getGlobalWindowMs() {
  return Math.max(
    60_000,
    parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || "900000", 10),
  );
}

function getGlobalMaxRequests() {
  return Math.max(
    1,
    parseInt(process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS || "100", 10),
  );
}

function getGlobalBlockMs() {
  return Math.max(
    1_000,
    parseInt(process.env.GLOBAL_RATE_LIMIT_BLOCK_MS || "300000", 10),
  );
}

function cleanupExpiredGlobal(nowMs: number) {
  for (const [key, state] of globalAttempts.entries()) {
    const windowExpired = nowMs - state.windowStartMs > getGlobalWindowMs();
    const blockExpired = state.blockedUntilMs <= nowMs;
    if (windowExpired && blockExpired) {
      globalAttempts.delete(key);
    }
  }

  // PERF-5: Prevent unbounded memory growth under attack
  if (globalAttempts.size > MAX_RATE_LIMIT_ENTRIES) {
    const entriesToDelete = Math.floor(globalAttempts.size * 0.1); // Delete 10%
    let deleted = 0;
    for (const [key] of globalAttempts.entries()) {
      if (deleted >= entriesToDelete) break;
      globalAttempts.delete(key);
      deleted++;
    }
    log.warn("rate_limit.evicted_entries_to_prevent_memory_leak", {
      entries_deleted: deleted,
      map_size: globalAttempts.size,
    });
  }
}

/**
 * Get global rate limit state for an IP address (spray attack prevention)
 * Returns whether the IP is currently blocked
 */
export async function getGlobalRateLimitState(ip: string, nowMs = Date.now()) {
  cleanupExpiredGlobal(nowMs);

  const state = globalAttempts.get(ip);
  if (!state) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (state.blockedUntilMs > nowMs) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((state.blockedUntilMs - nowMs) / 1_000),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

/**
 * Record a request for global rate limiting
 */
export async function recordGlobalRequest(
  ip: string,
  nowMs = Date.now(),
): Promise<void> {
  cleanupExpiredGlobal(nowMs);

  const windowMs = getGlobalWindowMs();
  const maxRequests = getGlobalMaxRequests();
  const blockMs = getGlobalBlockMs();

  const existing = globalAttempts.get(ip);

  if (!existing || nowMs - existing.windowStartMs > windowMs) {
    // New window
    globalAttempts.set(ip, {
      attempts: 1,
      windowStartMs: nowMs,
      blockedUntilMs: 0,
    });
    return;
  }

  const attempts = existing.attempts + 1;
  const blockedUntilMs = attempts >= maxRequests ? nowMs + blockMs : 0;

  globalAttempts.set(ip, {
    attempts,
    windowStartMs: existing.windowStartMs,
    blockedUntilMs,
  });
}
