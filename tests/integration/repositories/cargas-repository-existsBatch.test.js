import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query({ text: "DELETE FROM cargas;" });
});

afterEach(async () => {
  await database.query({ text: "DELETE FROM cargas;" });
});

describe("cargasRepository.existsBatch()", () => {
  test("should return empty set when no ids provided", async () => {
    const { default: cargasRepository } = await import("repositories/cargas-repository.js");
    const result = await cargasRepository.existsBatch([]);
    expect(result.size).toBe(0);
  });

  test("should return existing ids from the list", async () => {
    const { default: cargasRepository } = await import("repositories/cargas-repository.js");

    // Insert test cargas
    await database.query({
      text: `
        INSERT INTO cargas (id_viagem, origem, destino, produto)
        VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
      `,
      values: ["V001", "SP", "RJ", "Test1", "V002", "MG", "BA", "Test2"]
    });

    const result = await cargasRepository.existsBatch(["V001", "V003", "V002"]);

    expect(result.size).toBe(2);
    expect(result.has("V001")).toBe(true);
    expect(result.has("V002")).toBe(true);
    expect(result.has("V003")).toBe(false);
  });
});
