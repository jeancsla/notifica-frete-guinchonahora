import crypto from "crypto";
import migrationRunner from "node-pg-migrate";
import { join } from "node:path";
import database from "infra/database.js";
import { getSession } from "lib/session";

function checkAuth(request, response, session) {
  if (session?.user) {
    return true;
  }

  const apiKey = request.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!apiKey || !expectedKey) {
    response
      .status(401)
      .json({ error: "Unauthorized", message: "Invalid or missing API key" });
    return false;
  }

  try {
    const bufferA = Buffer.from(apiKey);
    const bufferB = Buffer.from(expectedKey);
    if (
      bufferA.length !== bufferB.length ||
      !crypto.timingSafeEqual(bufferA, bufferB)
    ) {
      throw new Error("Invalid key");
    }
  } catch (error) {
    response
      .status(401)
      .json({ error: "Unauthorized", message: "Invalid or missing API key" });
    return false;
  }

  return true;
}

export default async function migrations(request, response) {
  const session = await getSession(request, response);

  if (!checkAuth(request, response, session)) {
    return;
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
