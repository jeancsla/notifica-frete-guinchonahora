/**
 * Kysely database client for type-safe SQL queries
 */
import { Kysely, PostgresDialect } from "kysely";
import type { Database } from "./db-types";

let kyselyInstance: Kysely<Database> | null = null;

export function getKyselyDb(): Kysely<Database> {
  if (kyselyInstance) {
    return kyselyInstance;
  }

  const dialect = new PostgresDialect({
    pool: async () => {
      // Use the existing pool from database.ts
      const { getPool } = await import("./database");
      return getPool();
    },
  });

  kyselyInstance = new Kysely<Database>({
    dialect,
    log: process.env.DEBUG_SQL === "1" ? ["query", "error"] : ["error"],
  });

  return kyselyInstance;
}

/**
 * Destroy the Kysely instance (useful for testing and graceful shutdown)
 */
export async function destroyKyselyDb(): Promise<void> {
  if (kyselyInstance) {
    await kyselyInstance.destroy();
    kyselyInstance = null;
  }
}
