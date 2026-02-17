import { Client } from "pg";

async function query(queryObject) {
  let client;
  try {
    client = await getNewClient();
    const result = await client.query(queryObject);
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

async function getNewClient() {
  const poolMode = getPoolMode();
  const isTransactionPool = poolMode === "transaction";
  const defaultPort =
    isTransactionPool && !process.env.POSTGRES_PORT ? "6543" : undefined;
  const connectionString = process.env.DATABASE_URL;

  const client = new Client({
    connectionString: connectionString || undefined,
    host: connectionString ? undefined : process.env.POSTGRES_HOST,
    port: connectionString
      ? undefined
      : process.env.POSTGRES_PORT || defaultPort,
    user: connectionString ? undefined : process.env.POSTGRES_USER,
    password: connectionString ? undefined : process.env.POSTGRES_PASSWORD,
    database: connectionString ? undefined : process.env.POSTGRES_DB,
    ssl: getSSLValues(),
  });

  await client.connect();

  return client;
}

const database = {
  query,
  getNewClient,
};

export default database;

function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA,
    };
  }
  return process.env.NODE_ENV === "production" ? true : false;
}

function getPoolMode() {
  const value = process.env.POOL_MODE || process.env.POSTGRES_POOL_MODE || "";
  return value.toLowerCase();
}
