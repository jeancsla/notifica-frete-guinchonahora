import { beforeAll, describe, expect, test } from "bun:test";
import { createApp } from "./app";
import { resetReplayProtectionState } from "./lib/replay-protection";

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

  test("returns 401 when user-agent spoof attempts vercel cron bypass", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/cargas/check", {
        method: "POST",
        headers: {
          "user-agent": "vercel-cron/1.0",
        },
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe("/api/v1/cargas/webhook auth", () => {
  const secureHeaders = () => ({
    "x-cron-secret": "test-cron-secret",
    "x-cron-timestamp": String(Math.floor(Date.now() / 1000)),
    "x-cron-id": crypto.randomUUID(),
  });

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
    resetReplayProtectionState();
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/api/v1/cargas/webhook", {
        method: "POST",
        headers: {
          ...secureHeaders(),
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

  test("rejects secret in query string", async () => {
    const app = createApp();
    const headers = secureHeaders();
    const response = await app.handle(
      new Request(
        `http://localhost/api/v1/cargas/webhook?secret=${headers["x-cron-secret"]}`,
        {
          method: "POST",
          headers,
        },
      ),
    );

    expect(response.status).toBe(400);
  });

  test("rejects replayed x-cron-id", async () => {
    resetReplayProtectionState();
    const app = createApp();
    const replayId = crypto.randomUUID();
    const headers = {
      ...secureHeaders(),
      "x-cron-id": replayId,
      "x-test-processor-result": JSON.stringify({
        processed: 1,
        new_cargas: [{ id_viagem: "abc" }],
      }),
    };

    const first = await app.handle(
      new Request("http://localhost/api/v1/cargas/webhook", {
        method: "POST",
        headers,
      }),
    );
    expect(first.status).toBe(200);

    const second = await app.handle(
      new Request("http://localhost/api/v1/cargas/webhook", {
        method: "POST",
        headers,
      }),
    );
    expect(second.status).toBe(409);
  });
});
