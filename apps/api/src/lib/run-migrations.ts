import migrationRunner from "node-pg-migrate";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { logger } from "./logger";

const log = logger.child({ component: "run_migrations" });

/**
 * Run all pending database migrations automatically.
 *
 * Uses MIGRATION_DATABASE_URL if set (recommended: Supabase session pooler port 5432),
 * otherwise falls back to DATABASE_URL.
 *
 * Note: Supabase transaction pooler (port 6543) is NOT compatible with migrations.
 * Use the session pooler (port 5432) for MIGRATION_DATABASE_URL.
 */
export async function runMigrations(): Promise<void> {
  console.log("[run_migrations] Starting migration process");

  const dbUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  console.log("[run_migrations] MIGRATION_DATABASE_URL set:", !!process.env.MIGRATION_DATABASE_URL);
  console.log("[run_migrations] DATABASE_URL set:", !!process.env.DATABASE_URL);

  if (!dbUrl) {
    console.warn("[run_migrations] Skipped: no database URL configured");
    log.warn("run_migrations.skipped", { reason: "no_database_url" });
    return;
  }

  const migrationsDir = resolveMigrationsDir();
  console.log("[run_migrations] Migrations directory:", migrationsDir);

  if (!existsSync(migrationsDir)) {
    console.warn("[run_migrations] Skipped: migrations directory not found");
    log.warn("run_migrations.skipped", {
      reason: "migrations_dir_not_found",
      dir: migrationsDir,
    });
    return;
  }

  try {
    console.log("[run_migrations] Running migrations from:", migrationsDir);
    log.info("run_migrations.starting", { dir: migrationsDir });

    const result = await migrationRunner({
      databaseUrl: dbUrl,
      dir: migrationsDir,
      direction: "up",
      migrationsTable: "pgmigrations",
      verbose: false,
    });

    console.log("[run_migrations] Success! Applied migrations:", result.length);
    log.info("run_migrations.completed", { applied: result.length });
  } catch (error) {
    console.error("[run_migrations] Migration error:", error);
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    if (message.includes("another migration is already running")) {
      console.log("[run_migrations] Another migration is already running");
      log.warn("run_migrations.already_running");
      return;
    }

    // Log but don't throw — let the app start even if migrations fail
    // This prevents a full outage if the migration DB URL is misconfigured
    console.error("[run_migrations] Migration failed but continuing:", error);
    log.error("run_migrations.failed", { error });
  }
}

function resolveMigrationsDir(): string {
  if (process.env.MIGRATIONS_DIR) {
    return process.env.MIGRATIONS_DIR;
  }

  // From project root (Vercel deployment)
  const fromRoot = join(process.cwd(), "infra", "migrations");
  if (existsSync(fromRoot)) {
    return fromRoot;
  }

  // From apps/api directory (local dev)
  const fromApi = join(process.cwd(), "..", "..", "infra", "migrations");
  if (existsSync(fromApi)) {
    return fromApi;
  }

  return fromRoot;
}
