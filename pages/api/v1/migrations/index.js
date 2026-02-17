import migrationRunner from "node-pg-migrate";
import { join } from "node:path";
import database from "infra/database.js";

function checkAuth(request, response) {
  const apiKey = request.headers["x-admin-key"];
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    response.status(401).json({ error: "Unauthorized", message: "Invalid or missing API key" });
    return false;
  }
  return true;
}

export default async function migrations(request, response) {
  if (!checkAuth(request, response)) {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    return response.status(403).json({
      error: "Forbidden",
      message: "Migrations are disabled in production",
    });
  }

  const allowedMethods = ["GET", "POST"];
  if (!allowedMethods.includes(request.method)) {
    return response.status(405).json({
      error: `Method ${request.method} not allowed.`,
    });
  }

  let dbClient;
  try {
    dbClient = await database.getNewClient();

    const defaultMigrationOptions = {
      dbClient: dbClient,
      dir: join("infra", "migrations"),
      dryRun: true,
      direction: "up",
      verbose: true,
      migrationsTable: "pgmigrations",
    };
    if (request.method === "GET") {
      const pendingMigrations = await migrationRunner(defaultMigrationOptions);
      return response.status(200).json(pendingMigrations);
    }

    if (request.method === "POST") {
      const migratedMigrations = await migrationRunner({
        ...defaultMigrationOptions,
        dryRun: false,
      });

      if (migratedMigrations.length > 0) {
        return response.status(201).json(migratedMigrations);
      }
      return response.status(200).json(migratedMigrations);
    }
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (dbClient) {
      await dbClient.end();
    }
  }
}
