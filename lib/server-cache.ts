import { env } from "./env";

type CacheEntry<T = unknown> = {
  value: T;
  expiresAt: number;
  tags: Set<string>;
};

const cacheStore = new Map<string, CacheEntry>();

function isCacheEnabled(): boolean {
  if (env.TEST_MODE === "1") {
    return false;
  }
  return env.API_CACHE_ENABLED !== "false";
}

export function buildCacheKey(
  prefix: string,
  parts: Record<string, string | number | boolean | null | undefined> = {},
): string {
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

export function getServerCache<T>(key: string): T | null {
  if (!isCacheEnabled()) {
    return null;
  }

  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value;
}

export function setServerCache<T>(
  key: string,
  value: T,
  { ttlSeconds = 15, tags = [] as string[] } = {},
): void {
  if (!isCacheEnabled()) {
    return;
  }

  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
    tags: new Set(tags),
  });
}

export function invalidateServerCacheByTag(tag: string): void {
  if (!tag) {
    return;
  }

  for (const [key, entry] of cacheStore.entries()) {
    if (entry.tags.has(tag)) {
      cacheStore.delete(key);
    }
  }
}
