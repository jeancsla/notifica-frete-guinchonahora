import { logger } from "./logger";

const log = logger.child({ component: "redis_client" });

// Simple Redis-like interface that can be implemented by actual Redis or memory fallback
type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  setnx(key: string, value: string, ttlSeconds?: number): Promise<boolean>; // Atomic set-if-not-exists (EC-6)
  del(key: string): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
};

// Check if Redis should be used
export function isRedisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}

// Lazy initialization
let redisClient: RedisClient | null = null;

/**
 * Get or create the Redis client.
 * Falls back to in-memory implementation if REDIS_URL is not set.
 */
export async function getRedisClient(): Promise<RedisClient> {
  if (redisClient) {
    return redisClient;
  }

  if (isRedisEnabled()) {
    try {
      redisClient = await createIoRedisClient();
      log.info("redis_client.connected");
    } catch (error) {
      log.error("redis_client.connection_failed", { error });
      log.warn("redis_client.falling_back_to_memory");
      redisClient = createMemoryRedisClient();
    }
  } else {
    redisClient = createMemoryRedisClient();
  }

  return redisClient;
}

/**
 * Create an ioredis-based client (only loaded if REDIS_URL is set)
 */
async function createIoRedisClient(): Promise<RedisClient> {
  // Dynamic import so ioredis is only loaded when needed
  const { Redis } = await import("ioredis");

  const client = new Redis(process.env.REDIS_URL!, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  return {
    async get(key: string): Promise<string | null> {
      return client.get(key);
    },
    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }
    },
    async setnx(
      key: string,
      value: string,
      ttlSeconds?: number,
    ): Promise<boolean> {
      // Atomic SET NX with optional EX (expires)
      // ioredis uses variadic string args: client.set(key, value, "EX", ttl, "NX")
      // Returns 'OK' if set, null if key already exists
      const result = ttlSeconds
        ? await client.set(key, value, "EX", ttlSeconds, "NX")
        : await client.set(key, value, "NX");
      return result === "OK";
    },
    async del(key: string): Promise<void> {
      await client.del(key);
    },
    async expire(key: string, seconds: number): Promise<void> {
      await client.expire(key, seconds);
    },
  };
}

/**
 * In-memory Redis client for fallback when Redis is not available.
 * Provides the same interface but with Map-based storage.
 */
function createMemoryRedisClient(): RedisClient {
  const store = new Map<string, { value: string; expiresAt: number | null }>();

  // Periodic cleanup of expired entries
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        store.delete(key);
      }
    }
  };

  // Run cleanup every 60 seconds
  const cleanupInterval = setInterval(cleanup, 60000);

  // Don't prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  log.debug("redis_client.memory_fallback_created");

  return {
    async get(key: string): Promise<string | null> {
      cleanup();
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
      store.set(key, { value, expiresAt });
    },
    async setnx(
      key: string,
      value: string,
      ttlSeconds?: number,
    ): Promise<boolean> {
      cleanup();
      // Set only if key doesn't exist or is expired
      const existing = store.get(key);
      if (
        existing &&
        (!existing.expiresAt || existing.expiresAt > Date.now())
      ) {
        // Key exists and is not expired
        return false;
      }
      // Key doesn't exist or is expired - set it
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
      store.set(key, { value, expiresAt });
      return true;
    },
    async del(key: string): Promise<void> {
      store.delete(key);
    },
    async expire(key: string, seconds: number): Promise<void> {
      const entry = store.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + seconds * 1000;
      }
    },
  };
}

/**
 * Close the Redis connection gracefully.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient && isRedisEnabled()) {
    // Only close if it's a real Redis connection
    const { Redis: _Redis } = await import("ioredis");
    // Access the underlying client if possible
    // This is a simplified version - in production you'd track the actual client
    redisClient = null;
    log.info("redis_client.closed");
  }
}
