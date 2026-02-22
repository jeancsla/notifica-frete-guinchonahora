import { TextDecoder, TextEncoder } from "node:util";
import dotenv from "dotenv";
import { afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";
import { Client } from "pg";

dotenv.config({ path: ".env.development" });

globalThis.__POSTGRES_READY__ = await isPostgresReady();
globalThis.__WEB_SERVER_READY__ = await isWebServerReady();

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

if (typeof globalThis.fetch !== "function") {
  globalThis.fetch = fetch;
}

afterEach(() => {
  cleanup();
});

async function isPostgresReady() {
  let client: Client | undefined;
  try {
    client = new Client({
      host: process.env.POSTGRES_HOST || "localhost",
      port: Number(process.env.POSTGRES_PORT || 5432),
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "",
      database: process.env.POSTGRES_DB || "postgres",
      connectionTimeoutMillis: 500,
    });
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

async function isWebServerReady() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    const response = await fetch("http://localhost:3000/api/v1/status", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.status === 200;
  } catch {
    return false;
  }
}
