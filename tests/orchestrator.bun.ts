import retry from "async-retry";
import { Client } from "pg";

const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:3000";

export async function waitForAllServices() {
  await waitForWebServer();
  await waitForPostgres();
  await runMigrations();
}

async function waitForWebServer() {
  console.log("Waiting for Web Server...");
  const retries = 100;
  return retry(fetchStatusPage, {
    retries,
    maxTimeout: 1000,
    onRetry: (error, attempt) => {
      logRetry("Web Server not ready yet", error, attempt, retries);
    },
  });

  async function fetchStatusPage() {
    const response = await safeFetch(`${WEB_BASE_URL}/api/v1/status`);
    const status = response.status;

    if (status !== 200) {
      throw new Error(`Status page returned ${String(status)}`);
    }
    console.log("Web Server is ready!");
  }
}

async function waitForPostgres() {
  console.log("Waiting for Postgres...");
  const retries = 100;
  return retry(connectDatabase, {
    retries,
    maxTimeout: 1000,
    onRetry: (error, attempt) => {
      logRetry("Postgres not ready yet", error, attempt, retries);
    },
  });

  async function connectDatabase() {
    let client: Client | undefined;
    try {
      client = new Client(getDatabaseConfig());
      await client.connect();
      await client.query("SELECT 1");
      console.log("Postgres is ready!");
    } finally {
      if (client) {
        await client.end().catch(() => {});
      }
    }
  }
}

async function runMigrations() {
  const retries = 5;
  return retry(executeMigrations, {
    retries,
    maxTimeout: 1000,
    onRetry: (error, attempt) => {
      logRetry("Migrations endpoint not ready yet", error, attempt, retries);
    },
  });

  async function executeMigrations() {
    const response = await safeFetch(`${WEB_BASE_URL}/api/v1/migrations`, {
      method: "POST",
      headers: {
        "x-admin-key": process.env.ADMIN_API_KEY || "",
      },
    });

    if (![200, 201].includes(response.status)) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Failed to run migrations: ${response.status} ${errorBody}`.trim(),
      );
    }
  }
}

export async function getAuthCookie() {
  const response = await safeFetch(`${WEB_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "admin",
    }),
  });

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Failed to get auth cookie");
  }

  return setCookie.split(";")[0];
}

function logRetry(
  label: string,
  error: unknown,
  attempt: number,
  retries: number,
) {
  const shouldLog = attempt === 1 || attempt % 10 === 0 || attempt === retries;
  if (!shouldLog) {
    return;
  }
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  console.log(`Attempt ${attempt}: ${label}... ${message}`);
}

async function safeFetch(url: string, init?: Parameters<typeof fetch>[1]) {
  try {
    const response = await fetch(url, init);
    if (!response) {
      throw new Error("No response object returned");
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    throw new Error(`Request to ${url} failed: ${message}`, {
      cause: error,
    });
  }
}

function getDatabaseConfig() {
  return {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "",
    database: process.env.POSTGRES_DB || "postgres",
    ssl: process.env.NODE_ENV === "production" ? true : false,
  };
}

const orchestrator = {
  waitForAllServices,
  getAuthCookie,
};

export default orchestrator;
