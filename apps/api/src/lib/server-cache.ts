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

export function getServerCache<T>(key: string): T | null {
  if (!isCacheEnabled()) {
    return null;
  }

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

export function setServerCache(
  key: string,
  value: unknown,
  { ttlSeconds = 15, tags = [] as string[] } = {},
) {
  if (!isCacheEnabled()) {
    return;
  }

  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
    tags: new Set(tags),
  });
}

export function invalidateServerCacheByTag(tag: string) {
  if (!tag) {
    return;
  }

  for (const [key, entry] of cacheStore.entries()) {
    if (entry.tags.has(tag)) {
      cacheStore.delete(key);
    }
  }
}
