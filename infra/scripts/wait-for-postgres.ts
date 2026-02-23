#!/usr/bin/env bun

import { Client } from "pg";

function parseArg(name: string, defaultValue: number): number {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const parsed = value ? Number(value) : defaultValue;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canConnectOnce(): Promise<boolean> {
  const client = new Client(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST ?? process.env.PGHOST ?? "127.0.0.1",
          port: Number(process.env.DB_PORT ?? process.env.PGPORT ?? "5432"),
          user: process.env.DB_USER ?? process.env.PGUSER ?? "postgres",
          password: process.env.DB_PASSWORD ?? process.env.PGPASSWORD ?? "postgres",
          database: process.env.DB_NAME ?? process.env.PGDATABASE ?? "postgres",
        },
  );

  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const retries = parseArg("retries", 10);
  const intervalMs = parseArg("interval-ms", 1000);

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const ok = await canConnectOnce();
    if (ok) {
      console.log(`[wait-for-postgres] Ready after ${attempt}/${retries} attempt(s)`);
      process.exit(0);
    }

    if (attempt < retries) {
      console.log(`[wait-for-postgres] Attempt ${attempt}/${retries} failed; retrying in ${intervalMs}ms`);
      await sleep(intervalMs);
    }
  }

  console.error(`[wait-for-postgres] Postgres not ready after ${retries} attempt(s)`);
  process.exit(1);
}

await main();
