import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  test,
} from "bun:test";
import orchestrator from "tests/orchestrator.bun.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("POST /api/v1/migrations", () => {
  describe("Authentication", () => {
    test("should return 401 when API key is missing", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    test("should return 401 when API key is invalid", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
        headers: {
          "X-Admin-Key": "invalid-key",
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });
});
