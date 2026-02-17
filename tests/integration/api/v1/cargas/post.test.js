import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import cargoProcessor from "services/cargo-processor.js";

// Mock the processor
jest.mock("services/cargo-processor.js");

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await database.query("DELETE FROM cargas;");
  jest.clearAllMocks();
});

afterAll(async () => {
  await database.query("DELETE FROM cargas;");
});

describe("POST /api/v1/cargas/check", () => {
  test("should trigger cargo check and return results", async () => {
    cargoProcessor.process.mockResolvedValue({
      processed: 2,
      new_cargas: [
        { id_viagem: "12345", origem: "Sao Paulo - SP" },
        { id_viagem: "67890", origem: "Rio de Janeiro - RJ" },
      ],
    });

    const response = await fetch("http://localhost:3000/api/v1/cargas/check", {
      method: "POST",
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.processed).toBe(2);
    expect(responseBody.new_cargas).toHaveLength(2);
    expect(cargoProcessor.process).toHaveBeenCalled();
  });

  test("should return 200 with 0 processed when no new cargas", async () => {
    cargoProcessor.process.mockResolvedValue({
      processed: 0,
      new_cargas: [],
    });

    const response = await fetch("http://localhost:3000/api/v1/cargas/check", {
      method: "POST",
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.processed).toBe(0);
    expect(responseBody.new_cargas).toEqual([]);
  });

  test("should return 500 when processor throws error", async () => {
    cargoProcessor.process.mockRejectedValue(new Error("Scraper failed"));

    const response = await fetch("http://localhost:3000/api/v1/cargas/check", {
      method: "POST",
    });

    expect(response.status).toBe(500);

    const responseBody = await response.json();
    expect(responseBody.error).toBeDefined();
    expect(responseBody.message).toBe("Scraper failed");
  });

  test("should return proper error message for network errors", async () => {
    cargoProcessor.process.mockRejectedValue(
      new Error("Network request failed"),
    );

    const response = await fetch("http://localhost:3000/api/v1/cargas/check", {
      method: "POST",
    });

    expect(response.status).toBe(500);

    const responseBody = await response.json();
    expect(responseBody.error).toBe("Internal server error");
    expect(responseBody.message).toBe("Network request failed");
  });
});
