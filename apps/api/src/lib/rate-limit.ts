type RateLimitState = {
  attempts: number;
  windowStartMs: number;
  blockedUntilMs: number;
};

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

function cleanupExpired(nowMs: number) {
  for (const [key, state] of authAttempts.entries()) {
    const windowExpired = nowMs - state.windowStartMs > getWindowMs();
    const blockExpired = state.blockedUntilMs <= nowMs;
    if (windowExpired && blockExpired) {
      authAttempts.delete(key);
    }
  }
}

export function getAuthRateLimitState(key: string, nowMs = Date.now()) {
  cleanupExpired(nowMs);

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

export function recordAuthFailure(key: string, nowMs = Date.now()) {
  cleanupExpired(nowMs);

  const windowMs = getWindowMs();
  const maxAttempts = getMaxAttempts();
  const blockMs = getBlockMs();
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

export function clearAuthFailures(key: string) {
  authAttempts.delete(key);
}

export function resetAuthRateLimitState() {
  authAttempts.clear();
}
