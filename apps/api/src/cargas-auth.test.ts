import { beforeAll, describe, expect, test } from "bun:test";
import { createApp } from "./app";

beforeAll(() => {
  process.env.TEST_MODE = "1";
  process.env.ADMIN_API_KEY = "test-admin-key";
  process.env.CRON_WEBHOOK_SECRET = "test-cron-secret";
});

describe("/api/v1/cargas/check auth", () => {
  test("returns 401 without api key", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/cargas/check", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("returns 200 with admin key and mocked result", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/cargas/check", {
        method: "POST",
        headers: {
          "x-admin-key": "test-admin-key",
          "x-test-processor-result": JSON.stringify({
            processed: 2,
            new_cargas: [{ id_viagem: "1" }],
          }),
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(2);
  });
});

describe("/api/v1/cargas/webhook auth", () => {
  test("returns 401 without secret", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/cargas/webhook", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  test("returns 200 with secret and mocked result", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/cargas/webhook", {
        method: "POST",
        headers: {
          "x-cron-secret": "test-cron-secret",
          "x-test-processor-result": JSON.stringify({
            processed: 1,
            new_cargas: [{ id_viagem: "abc" }],
          }),
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
