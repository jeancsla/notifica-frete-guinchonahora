import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.development" });

const args = parseArgs(process.argv.slice(2));
const MAX_RETRIES = args.retries;
const RETRY_INTERVAL_MS = args.intervalMs;
const SILENT = args.silent;

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
  if (!SILENT) {
    process.stdout.write("Aguardando Postgres");
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    let client: Client | undefined;
    try {
      client = new Client(getConfig());
      await client.connect();
      await client.query("SELECT 1;");
      if (!SILENT) {
        process.stdout.write(
          "\n\nPostgres esta pronto e aceitando conexoes\n\n",
        );
      }
      process.exit(0);
    } catch {
      if (!SILENT) {
        process.stdout.write(".");
      }
      await sleep(RETRY_INTERVAL_MS);
    } finally {
      if (client) {
        await client.end().catch(() => {});
      }
    }
  }

  if (!SILENT) {
    process.stdout.write(
      `\n\nNao foi possivel conectar ao Postgres apos ${MAX_RETRIES} tentativas.\n`,
    );
    process.stdout.write(
      "Verifique se o Postgres esta rodando localmente ou instale/inicie Docker.\n\n",
    );
  }
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await checkPostgres();

function parseArgs(cliArgs: string[]) {
  let retries = 60;
  let intervalMs = 1000;
  let silent = false;

  for (const arg of cliArgs) {
    if (arg.startsWith("--retries=")) {
      const value = Number(arg.slice("--retries=".length));
      if (!Number.isNaN(value) && value > 0) {
        retries = value;
      }
    } else if (arg.startsWith("--interval-ms=")) {
      const value = Number(arg.slice("--interval-ms=".length));
      if (!Number.isNaN(value) && value > 0) {
        intervalMs = value;
      }
    } else if (arg === "--silent") {
      silent = true;
    }
  }

  return { retries, intervalMs, silent };
}
