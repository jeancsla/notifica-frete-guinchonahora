import { Pool, type QueryResult, type PoolClient } from "pg";
import { logger } from "../lib/logger";
import { recordDbQuery } from "../lib/metrics";

const log = logger.child({ component: "database" });

// Lazy initialization - pool is created on first use
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

function createPool(): Pool {
  const config = getDatabaseConfig();
  const newPool = new Pool({
    ...config,
    // Pool configuration
    max: Number(process.env.POSTGRES_POOL_MAX ?? "20"),
    min: Number(process.env.POSTGRES_POOL_MIN ?? "2"),
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS ?? "30000"),
    connectionTimeoutMillis: Number(
      process.env.POSTGRES_CONNECTION_TIMEOUT_MS ?? "10000",
    ),
  });

  // Log pool events for observability
  newPool.on("connect", () => {
    log.debug("database.pool_client_connected");
  });

  newPool.on("acquire", () => {
    log.debug("database.pool_client_acquired");
  });

  newPool.on("remove", () => {
    log.debug("database.pool_client_removed");
  });

  newPool.on("error", (err) => {
    log.error("database.pool_error", { error: err });
  });

  log.info("database.pool_created", {
    max: newPool.options.max,
    min: newPool.options.min,
  });

  return newPool;
}

/**
 * Execute a query using a pooled connection.
 * The connection is automatically released back to the pool.
 */
export async function query(
  queryObject: string | { text: string; values?: unknown[] },
  operation: string = "query",
): Promise<QueryResult> {
  const poolInstance = getPool();
  const start = performance.now();
  try {
    const result = await poolInstance.query(queryObject);
    recordDbQuery(operation, (performance.now() - start) / 1000);
    return result;
  } catch (error) {
    recordDbQuery(operation, (performance.now() - start) / 1000);
    log.error("database.query_failed", { error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions.
 * Caller MUST call client.release() when done.
 */
export async function getPooledClient(): Promise<PoolClient> {
  const poolInstance = getPool();
  try {
    const client = await poolInstance.connect();
    return client;
  } catch (error) {
    log.error("database.get_client_failed", { error });
    throw error;
  }
}

/**
 * Execute a function within a transaction.
 * Automatically handles BEGIN/COMMIT/ROLLBACK.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPooledClient();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
      // Ignore rollback errors, log for debugging
      log.warn("database.rollback_failed", { error });
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * @deprecated Use getPooledClient() for transactions or query() for simple queries.
 * Kept for backward compatibility during migration.
 */
export async function getNewClient(): Promise<PoolClient> {
  return getPooledClient();
}

/**
 * Gracefully close the pool.
 * Call this on application shutdown.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    log.info("database.pool_closed");
    pool = null;
  }
}

function getDatabaseConfig() {
  const ssl = getSSLValues();

  const requiredVars = [
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "POSTGRES_USER",
    "POSTGRES_DB",
    "POSTGRES_PASSWORD",
  ];

  const missing = requiredVars.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing database environment variables: ${missing.join(", ")}. Provide DATABASE_URL or the full POSTGRES_* set.`,
    );
  }

  return {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl,
    options: getConnectionOptions(),
  };
}

function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA.replace(/\\n/g, "\n"),
    };
  }

  return process.env.NODE_ENV === "production" ? true : false;
}

function getConnectionOptions() {
  const explicit = process.env.POSTGRES_OPTIONS?.trim();
  if (explicit) {
    return explicit;
  }

  return [
    "-c search_path=public",
    "-c statement_timeout=10000",
    "-c lock_timeout=5000",
    "-c idle_in_transaction_session_timeout=10000",
    "-c app.current_role=api",
  ].join(" ");
}
