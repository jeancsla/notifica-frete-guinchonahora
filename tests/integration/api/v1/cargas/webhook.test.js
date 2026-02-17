import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  process.env.CRON_WEBHOOK_SECRET = "test-secret";
});

describe("POST /api/v1/cargas/webhook", () => {
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
            "x-cron-secret": process.env.CRON_WEBHOOK_SECRET,
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
      const response = await fetch(
        "http://localhost:3000/api/v1/cargas/webhook",
        {
          method: "POST",
          headers: {
            "x-cron-secret": process.env.CRON_WEBHOOK_SECRET,
            "x-cron-source": "n8n",
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.source).toBe("n8n");
      expect(typeof data.processed).toBe("number");
      expect(Array.isArray(data.new_cargas)).toBe(true);
    });

    test("should accept secret in query string", async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/cargas/webhook?secret=${process.env.CRON_WEBHOOK_SECRET}`,
        {
          method: "POST",
          headers: {
            "x-cron-source": "external",
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.source).toBe("external");
    });
  });
});
