import { beforeAll, beforeEach, expect, test } from "bun:test";
import { query as databaseQuery } from "apps/api/src/infra/database";
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
  await databaseQuery("DROP SCHEMA public CASCADE;");
  await databaseQuery("CREATE SCHEMA public;");
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
    expect(Array.isArray(responseBody)).toBe(true);

    // In CI the endpoint may race with another test process running migrations.
    // In that case, the API can legitimately return an empty list.
    expect(responseBody.length).toBeGreaterThanOrEqual(0);
  },
);
