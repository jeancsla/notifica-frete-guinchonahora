import { logger } from "./logger";
import { getRedisClient, isRedisEnabled } from "./redis-client";

const log = logger.child({ component: "server_cache" });

// In-memory fallback store
const cacheStore = new Map<
  string,
  { value: unknown; expiresAt: number; tags: Set<string> }
>();

function isCacheEnabled() {
  if (process.env.TEST_MODE === "1") {
    return false;
  }

  return process.env.API_CACHE_ENABLED !== "false";
}

function getCacheKey(key: string): string {
  const prefix = process.env.CACHE_KEY_PREFIX || "cargo:cache";
  return `${prefix}:${key}`;
}

export function buildCacheKey(
  prefix: string,
  parts: Record<string, unknown> = {},
) {
  const sortedEntries = Object.entries(parts)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .sort(([a], [b]) => a.localeCompare(b));

  if (sortedEntries.length === 0) {
    return prefix;
  }

  const query = sortedEntries
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

  return `${prefix}?${query}`;
}

export async function getServerCache<T>(key: string): Promise<T | null> {
  if (!isCacheEnabled()) {
    return null;
  }

  // Try Redis first if enabled
  if (isRedisEnabled()) {
    try {
      const client = await getRedisClient();
      const value = await client.get(getCacheKey(key));
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      log.warn("server_cache.redis_get_failed", { key, error });
      // Fall through to memory cache
    }
  }

  // In-memory fallback
  const entry = cacheStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function setServerCache(
  key: string,
  value: unknown,
  { ttlSeconds = 15, tags = [] as string[] } = {},
) {
  if (!isCacheEnabled()) {
    return;
  }

  // Try Redis first if enabled
  if (isRedisEnabled()) {
    try {
      const client = await getRedisClient();
      await client.set(
        getCacheKey(key),
        JSON.stringify(value),
        ttlSeconds,
      );
      // Store tags in a separate key for Redis
      if (tags.length > 0) {
        await client.set(
          getCacheKey(`${key}:tags`),
          JSON.stringify(tags),
          ttlSeconds,
        );
      }
      return;
    } catch (error) {
      log.warn("server_cache.redis_set_failed", { key, error });
      // Fall through to memory cache
    }
  }

  // In-memory fallback
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
    tags: new Set(tags),
  });
}

export async function invalidateServerCacheByTag(tag: string) {
  if (!tag) {
    return;
  }

  // For Redis, we need a different approach - using tag index
  if (isRedisEnabled()) {
    try {
      // This is a simplified implementation
      // In production, you'd want to use a proper tag index (Redis Set per tag)
      log.warn("server_cache.redis_tag_invalidation_simplified", { tag });
    } catch (error) {
      log.warn("server_cache.redis_invalidate_failed", { tag, error });
    }
  }

  // In-memory cleanup
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.tags.has(tag)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  redisEnabled: boolean;
  memoryEntries: number;
}> {
  return {
    redisEnabled: isRedisEnabled(),
    memoryEntries: cacheStore.size,
  };
}
