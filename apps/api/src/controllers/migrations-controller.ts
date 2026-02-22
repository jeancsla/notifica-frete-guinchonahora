import migrationRunner from "node-pg-migrate";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getNewClient } from "../infra/database";
import { getSessionUser } from "../lib/session";
import { timingSafeEqualString } from "../lib/security";

function isAuthorized(request: Request) {
  if (getSessionUser(request)) {
    return true;
  }

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
  set: { status?: number | string };
}) {
  if (!isAuthorized(request)) {
    set.status = 401;
    return { error: "Unauthorized", message: "Invalid or missing API key" };
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_MIGRATIONS !== "true"
  ) {
    set.status = 403;
    return {
      error: "Forbidden",
      message:
        "Migrations are disabled in production. Set ALLOW_PRODUCTION_MIGRATIONS=true to enable.",
    };
  }

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    set.status = 405;
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

    return result;
  } catch (error) {
    set.status = 500;
    return {
      error: "Failed to run migrations",
      message: (error as Error).message,
    };
  } finally {
    if (dbClient) {
      await dbClient.end();
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
