import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import orchestrator from "tests/orchestrator.bun";
import { query as databaseQuery } from "apps/api/src/infra/database";

const postgresReady = Boolean(globalThis.__POSTGRES_READY__);
const describeIfPostgres = postgresReady ? describe : describe.skip;

beforeAll(async () => {
  if (!postgresReady) {
    return;
  }
  await orchestrator.waitForAllServices();
  await databaseQuery({ text: "DELETE FROM cargas;" });
});

afterEach(async () => {
  if (!postgresReady) {
    return;
  }
  await databaseQuery({ text: "DELETE FROM cargas;" });
});

describeIfPostgres("cargasRepository.existsBatch()", () => {
  test("should return empty set when no ids provided", async () => {
    const { cargasRepository } =
      await import("apps/api/src/repositories/cargas-repository");
    const result = await cargasRepository.existsBatch([]);
    expect(result.size).toBe(0);
  });

  test("should return existing ids from the list", async () => {
    const { cargasRepository } =
      await import("apps/api/src/repositories/cargas-repository");

    // Insert test cargas
    await databaseQuery({
      text: `
        INSERT INTO cargas (id_viagem, origem, destino, produto)
        VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
      `,
      values: ["V001", "SP", "RJ", "Test1", "V002", "MG", "BA", "Test2"],
    });

    const result = await cargasRepository.existsBatch(["V001", "V003", "V002"]);

    expect(result.size).toBe(2);
    expect(result.has("V001")).toBe(true);
    expect(result.has("V002")).toBe(true);
    expect(result.has("V003")).toBe(false);
  });
});
