import migrationRunner from "node-pg-migrate";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getNewClient } from "../infra/database";
import { attachRequestIdHeader, createRequestLogger } from "../lib/logger";
import { timingSafeEqualString } from "../lib/security";

function hasAdminApiKey(request: Request) {
  const apiKey = request.headers.get("x-admin-key") || "";
  const expectedKey = process.env.ADMIN_API_KEY || "";
  if (!apiKey || !expectedKey) {
    return false;
  }

  return timingSafeEqualString(apiKey, expectedKey);
}

export async function migrationsHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers?: Record<string, string | number> };
}) {
  const log = createRequestLogger(request).child({ handler: "migrations" });
  attachRequestIdHeader(set.headers, request);

  if (!hasAdminApiKey(request)) {
    set.status = 401;
    log.warn("migrations.unauthorized");
    return { error: "Unauthorized", message: "Invalid or missing API key" };
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_MIGRATIONS !== "true"
  ) {
    set.status = 403;
    log.warn("migrations.forbidden_in_production");
    return {
      error: "Forbidden",
      message:
        "Migrations are disabled in production. Set ALLOW_PRODUCTION_MIGRATIONS=true to enable.",
    };
  }

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    set.status = 405;
    log.warn("migrations.method_not_allowed", { method: request.method });
    return {
      error: `Method ${request.method} not allowed.`,
    };
  }

  let dbClient: Awaited<ReturnType<typeof getNewClient>> | undefined;

  try {
    dbClient = await getNewClient();
    const migrationsDir = resolveMigrationsDir();

    const options = {
      dbClient,
      dir: migrationsDir,
      dryRun: method === "GET",
      direction: "up" as const,
      verbose: true,
      migrationsTable: "pgmigrations",
    };

    const result = await migrationRunner(options);

    if (method === "POST") {
      set.status = result.length > 0 ? 201 : 200;
    }

    log.info("migrations.executed", {
      method,
      applied_count: result.length,
      dry_run: method === "GET",
    });

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);
    if (message.includes("another migration is already running")) {
      set.status = 200;
      log.warn("migrations.already_running");
      return [];
    }

    log.error("migrations.failed", { error });
    set.status = 500;
    return {
      error: "Failed to run migrations",
      message: "Unexpected error",
    };
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
}

function resolveMigrationsDir() {
  if (process.env.MIGRATIONS_DIR) {
    return process.env.MIGRATIONS_DIR;
  }

  const localFromApiDir = join(
    process.cwd(),
    "..",
    "..",
    "infra",
    "migrations",
  );
  if (existsSync(localFromApiDir)) {
    return localFromApiDir;
  }

  return join(process.cwd(), "infra", "migrations");
}
