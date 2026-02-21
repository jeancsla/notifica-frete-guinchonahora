const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({ path: ".env.development" });

const MAX_RETRIES = 60;
const RETRY_INTERVAL_MS = 1000;

function getConfig() {
  return {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "",
    database: process.env.POSTGRES_DB || "postgres",
  };
}

async function checkPostgres() {
  process.stdout.write("🔴 Aguardando Postgres");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    let client;
    try {
      client = new Client(getConfig());
      await client.connect();
      await client.query("SELECT 1;");
      process.stdout.write(
        "\n\n🟢 Postgres está pronto e aceitando conexões\n\n",
      );
      process.exit(0);
    } catch {
      process.stdout.write(".");
      await sleep(RETRY_INTERVAL_MS);
    } finally {
      if (client) {
        await client.end().catch(() => {});
      }
    }
  }

  process.stdout.write(
    "\n\n❌ Não foi possível conectar ao Postgres após 60 tentativas.\n",
  );
  process.stdout.write(
    "Verifique se o Postgres está rodando localmente ou instale/inicie Docker.\n\n",
  );
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

checkPostgres();
