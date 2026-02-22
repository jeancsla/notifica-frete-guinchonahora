import { beforeAll, beforeEach, expect, test } from "bun:test";
import database from "infra/database";
import orchestrator from "tests/orchestrator.bun";

const integrationReady = Boolean(
  globalThis.__POSTGRES_READY__ && globalThis.__WEB_SERVER_READY__,
);
const testIfIntegration = integrationReady ? test : test.skip;

beforeAll(async () => {
  if (!integrationReady) {
    return;
  }
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE;");
  await database.query("CREATE SCHEMA public;");
});

beforeEach(() => {
  if (!integrationReady) {
    return;
  }
  process.env.ADMIN_API_KEY = "test-admin-key";
});

testIfIntegration(
  "GET /api/v1/migrations deve retornar status 200",
  async () => {
    const response = await fetch("http://localhost:3000/api/v1/migrations", {
      headers: {
        "X-Admin-Key": "test-admin-key",
      },
    });
    expect(response.status).toBe(200);

    const responseBody = await response.json();
    // console.log(responseBody);

    expect(Array.isArray(responseBody)).toBe(true);

    expect(responseBody.length).toBeGreaterThan(0);
  },
);
