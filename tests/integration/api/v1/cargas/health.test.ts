import { beforeAll, describe, expect, test } from "bun:test";
import orchestrator from "tests/orchestrator.bun";

const integrationReady = Boolean(
  globalThis.__POSTGRES_READY__ && globalThis.__WEB_SERVER_READY__,
);
const describeIfIntegration = integrationReady ? describe : describe.skip;

beforeAll(async () => {
  if (!integrationReady) {
    return;
  }
  await orchestrator.waitForAllServices();
  process.env.ADMIN_API_KEY = "test-admin-key";
});

describeIfIntegration("GET /api/v1/cargas/health", () => {
  test("should return 401 when credentials are missing", async () => {
    const response = await fetch("http://localhost:3000/api/v1/cargas/health");
    expect(response.status).toBe(401);
  });

  test("should return 200 with valid admin api key", async () => {
    const response = await fetch("http://localhost:3000/api/v1/cargas/health", {
      headers: {
        "x-admin-key": "test-admin-key",
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(["healthy", "warning"]).toContain(body.status);
    expect(body.stats).toBeDefined();
  });
});
