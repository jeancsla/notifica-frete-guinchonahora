import { Client, type QueryResult } from "pg";

export async function query(
  queryObject: string | { text: string; values?: unknown[] },
) {
  let client: Client | undefined;
  try {
    client = await getNewClient();
    const result = await client.query(queryObject as never);
    return result as QueryResult;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

export async function getNewClient() {
  const client = new Client(getDatabaseConfig());
  await client.connect();
  return client;
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
