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
import cargasRepository from "repositories/cargas-repository.js";
import database from "infra/database.js";
import Carga from "models/carga.js";

beforeAll(async () => {
  // Clean table before tests
  await database.query("DELETE FROM cargas;");
});

afterEach(async () => {
  // Clean table after each test
  await database.query("DELETE FROM cargas;");
});

describe("Cargas Repository", () => {
  describe("save", () => {
    test("should save a carga to the database", async () => {
      const carga = new Carga({
        id_viagem: "12345",
        tipoTransporte: "Transporte Rodoviario",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
        equipamento: " Truck",
        prevColeta: "15/02/2026",
        qtdeEntregas: "2",
        vrFrete: "R$ 1.500,00",
        termino: "15/02/2026 18:00",
      });

      const result = await cargasRepository.save(carga);

      expect(result.id).toBeDefined();
      expect(result.id_viagem).toBe("12345");
      expect(result.origem).toBe("Sao Paulo - SP");
      expect(result.created_at).toBeDefined();
    });

    test("should throw error when saving duplicate id_viagem", async () => {
      const carga1 = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
      });

      const carga2 = new Carga({
        id_viagem: "12345",
        origem: "Belo Horizonte - MG",
        destino: "Salvador - BA",
      });

      await cargasRepository.save(carga1);

      await expect(cargasRepository.save(carga2)).rejects.toThrow();
    });
  });

  describe("exists", () => {
    test("should return true when carga exists", async () => {
      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
      });

      await cargasRepository.save(carga);

      const exists = await cargasRepository.exists("12345");

      expect(exists).toBe(true);
    });

    test("should return false when carga does not exist", async () => {
      const exists = await cargasRepository.exists("99999");

      expect(exists).toBe(false);
    });
  });

  describe("markAsNotified", () => {
    test("should update notificado_em timestamp", async () => {
      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
      });

      await cargasRepository.save(carga);

      await cargasRepository.markAsNotified("12345");

      const result = await database.query({
        text: "SELECT notificado_em FROM cargas WHERE id_viagem = $1;",
        values: ["12345"],
      });

      expect(result.rows[0].notificado_em).toBeDefined();
    });

    test("should not throw when id_viagem does not exist", async () => {
      await cargasRepository.markAsNotified("99999");
      expect(true).toBe(true);
    });
  });

  describe("findAll", () => {
    test("should return all cargas ordered by created_at desc", async () => {
      const carga1 = new Carga({
        id_viagem: "11111",
        origem: "Sao Paulo - SP",
      });
      const carga2 = new Carga({
        id_viagem: "22222",
        origem: "Rio de Janeiro - RJ",
      });

      await cargasRepository.save(carga1);
      await cargasRepository.save(carga2);

      const results = await cargasRepository.findAll();

      expect(results).toHaveLength(2);
      expect(results[0].id_viagem).toBe("22222");
      expect(results[1].id_viagem).toBe("11111");
    });

    test("should respect limit parameter", async () => {
      const carga1 = new Carga({ id_viagem: "11111", origem: "A" });
      const carga2 = new Carga({ id_viagem: "22222", origem: "B" });
      const carga3 = new Carga({ id_viagem: "33333", origem: "C" });

      await cargasRepository.save(carga1);
      await cargasRepository.save(carga2);
      await cargasRepository.save(carga3);

      const results = await cargasRepository.findAll({ limit: 2 });

      expect(results).toHaveLength(2);
    });

    test("should respect offset parameter", async () => {
      const carga1 = new Carga({ id_viagem: "11111", origem: "A" });
      const carga2 = new Carga({ id_viagem: "22222", origem: "B" });

      await cargasRepository.save(carga1);
      await cargasRepository.save(carga2);

      const results = await cargasRepository.findAll({ limit: 1, offset: 1 });

      expect(results).toHaveLength(1);
      expect(results[0].id_viagem).toBe("11111");
    });
  });

  describe("findNotNotified", () => {
    test("should return only cargas not yet notified", async () => {
      const cargaNotified = new Carga({
        id_viagem: "11111",
        origem: "Sao Paulo - SP",
      });
      const cargaNotNotified = new Carga({
        id_viagem: "22222",
        origem: "Rio de Janeiro - RJ",
      });

      await cargasRepository.save(cargaNotified);
      await cargasRepository.save(cargaNotNotified);
      await cargasRepository.markAsNotified("11111");

      const results = await cargasRepository.findNotNotified();

      expect(results).toHaveLength(1);
      expect(results[0].id_viagem).toBe("22222");
    });

    test("should return empty array when all cargas are notified", async () => {
      const carga = new Carga({
        id_viagem: "11111",
        origem: "Sao Paulo - SP",
      });

      await cargasRepository.save(carga);
      await cargasRepository.markAsNotified("11111");

      const results = await cargasRepository.findNotNotified();

      expect(results).toHaveLength(0);
    });
  });
});
