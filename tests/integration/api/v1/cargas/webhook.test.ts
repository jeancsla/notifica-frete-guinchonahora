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
  process.env.CRON_WEBHOOK_SECRET = "test-secret";
});

const webhookSecret = process.env.CRON_WEBHOOK_SECRET ?? "";

describeIfIntegration("POST /api/v1/cargas/webhook", () => {
  describe("Authentication", () => {
    test("should return 401 when webhook secret header is missing", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/cargas/webhook",
        {
          method: "POST",
        },
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
      expect(data.message).toBe("Invalid or missing webhook secret");
    });

    test("should return 401 when webhook secret is invalid", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/cargas/webhook",
        {
          method: "POST",
          headers: {
            "x-cron-secret": "wrong-secret",
          },
        },
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Method validation", () => {
    test("should return 405 for GET requests", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/cargas/webhook",
        {
          method: "GET",
          headers: {
            "x-cron-secret": webhookSecret,
          },
        },
      );

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe("Method not allowed");
    });
  });

  describe("Success cases", () => {
    test("should process cargas with valid secret in header", async () => {
      const mockedResult = {
        processed: 2,
        new_cargas: [
          { id_viagem: "12345", origem: "Sao Paulo - SP" },
          { id_viagem: "67890", origem: "Rio de Janeiro - RJ" },
        ],
      };

      const response = await fetch(
        "http://localhost:3000/api/v1/cargas/webhook",
        {
          method: "POST",
          headers: {
            "x-cron-secret": webhookSecret,
            "x-cron-source": "n8n",
            "x-test-processor-result": JSON.stringify(mockedResult),
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.source).toBe("n8n");
      expect(data.processed).toBe(2);
      expect(data.new_cargas).toHaveLength(2);
    });

    test("should accept secret in query string", async () => {
      const mockedResult = {
        processed: 1,
        new_cargas: [{ id_viagem: "11111", origem: "Belo Horizonte - MG" }],
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/cargas/webhook?secret=${webhookSecret}`,
        {
          method: "POST",
          headers: {
            "x-cron-source": "external",
            "x-test-processor-result": JSON.stringify(mockedResult),
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.source).toBe("external");
      expect(data.processed).toBe(1);
    });
  });

  describe("Error handling", () => {
    test("should return 500 when processor throws error", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/cargas/webhook",
        {
          method: "POST",
          headers: {
            "x-cron-secret": webhookSecret,
            "x-test-processor-error": "Scraper connection failed",
          },
        },
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Scraper connection failed");
    });
  });
});
