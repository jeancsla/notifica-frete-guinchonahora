const cacheStore = new Map();

function isCacheEnabled() {
  if (process.env.TEST_MODE === "1") {
    return false;
  }
  return process.env.API_CACHE_ENABLED !== "false";
}

export function buildCacheKey(prefix, parts = {}) {
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

export function getServerCache(key) {
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

  return entry.value;
}

export function setServerCache(
  key,
  value,
  { ttlSeconds = 15, tags = [] } = {},
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

export function invalidateServerCacheByTag(tag) {
  if (!tag) {
    return;
  }

  for (const [key, entry] of cacheStore.entries()) {
    if (entry.tags.has(tag)) {
      cacheStore.delete(key);
    }
  }
}
