import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import Carga from "models/carga.js";
import cargasRepository from "repositories/cargas-repository.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await database.query("DELETE FROM cargas;");
});

afterAll(async () => {
  await database.query("DELETE FROM cargas;");
});

describe("GET /api/v1/cargas", () => {
  test("should return empty array when no cargas exist", async () => {
    const response = await fetch("http://localhost:3000/api/v1/cargas");

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      cargas: [],
      pagination: {
        total: 0,
        limit: 10,
        offset: 0,
      },
    });
  });

  test("should return list of cargas", async () => {
    const carga1 = new Carga({
      id_viagem: "12345",
      tipoTransporte: "Rodoviario",
      origem: "Sao Paulo - SP",
      destino: "Rio de Janeiro - RJ",
      produto: "Carga Geral",
      equipamento: " Truck",
      prevColeta: "15/02/2026",
      qtdeEntregas: "2",
      vrFrete: "R$ 1.500,00",
      termino: "15/02/2026 18:00",
    });

    const carga2 = new Carga({
      id_viagem: "67890",
      tipoTransporte: "Aereo",
      origem: "Belo Horizonte - MG",
      destino: "Salvador - BA",
      produto: "Eletronicos",
      equipamento: "Van",
      prevColeta: "20/02/2026",
      qtdeEntregas: "1",
      vrFrete: "R$ 2.000,00",
      termino: "20/02/2026 12:00",
    });

    await cargasRepository.save(carga1);
    await cargasRepository.save(carga2);

    const response = await fetch("http://localhost:3000/api/v1/cargas");

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas).toHaveLength(2);
    expect(responseBody.pagination.total).toBe(2);

    // Should be ordered by created_at desc (newest first)
    expect(responseBody.cargas[0].id_viagem).toBe("67890");
    expect(responseBody.cargas[1].id_viagem).toBe("12345");
  });

  test("should respect limit query parameter", async () => {
    const carga1 = new Carga({ id_viagem: "11111", origem: "A" });
    const carga2 = new Carga({ id_viagem: "22222", origem: "B" });
    const carga3 = new Carga({ id_viagem: "33333", origem: "C" });

    await cargasRepository.save(carga1);
    await cargasRepository.save(carga2);
    await cargasRepository.save(carga3);

    const response = await fetch("http://localhost:3000/api/v1/cargas?limit=2");

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas).toHaveLength(2);
    expect(responseBody.pagination.limit).toBe(2);
  });

  test("should respect offset query parameter", async () => {
    const carga1 = new Carga({ id_viagem: "11111", origem: "A" });
    const carga2 = new Carga({ id_viagem: "22222", origem: "B" });

    await cargasRepository.save(carga1);
    await cargasRepository.save(carga2);

    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?limit=1&offset=1",
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas).toHaveLength(1);
    expect(responseBody.cargas[0].id_viagem).toBe("11111");
    expect(responseBody.pagination.offset).toBe(1);
  });

  test("should filter by notified status", async () => {
    const cargaNotified = new Carga({
      id_viagem: "11111",
      origem: "Notified Carga",
    });
    const cargaNotNotified = new Carga({
      id_viagem: "22222",
      origem: "Not Notified Carga",
    });

    await cargasRepository.save(cargaNotified);
    await cargasRepository.save(cargaNotNotified);
    await cargasRepository.markAsNotified("11111");

    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?notified=false",
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas).toHaveLength(1);
    expect(responseBody.cargas[0].id_viagem).toBe("22222");
  });

  test("should return 400 for invalid limit parameter", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?limit=invalid",
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.error).toBeDefined();
  });

  test("should return 400 for negative offset", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?offset=-1",
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.error).toBeDefined();
  });
});
