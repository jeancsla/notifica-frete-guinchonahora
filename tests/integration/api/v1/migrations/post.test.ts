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
  "POST /api/v1/migrations deve retornar status 200 ou 201",
  async () => {
    const response = await fetch("http://localhost:3000/api/v1/migrations", {
      method: "POST",
      headers: {
        "X-Admin-Key": "test-admin-key",
      },
    });
    expect([200, 201]).toContain(response.status);

    const responseBody = await response.json();
    expect(Array.isArray(responseBody)).toBe(true);

    if (response.status === 201) {
      expect(responseBody.length).toBeGreaterThan(0);
    } else {
      expect(responseBody.length).toBe(0);
    }
  },
);

testIfIntegration(
  "POST /api/v1/migrations deve retornar status 200",
  async () => {
    const response2 = await fetch("http://localhost:3000/api/v1/migrations", {
      method: "POST",
      headers: {
        "X-Admin-Key": "test-admin-key",
      },
    });
    expect(response2.status).toBe(200);

    const response2Body = await response2.json();
    //console.log(responseBody.length);

    expect(Array.isArray(response2Body)).toBe(true);
    expect(response2Body.length).toBe(0);
  },
);
