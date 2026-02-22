import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import orchestrator from "tests/orchestrator.bun";
import database from "infra/database";
import Carga from "@notifica/shared/models/Carga";
import cargasRepository from "repositories/cargas-repository";

const integrationReady = Boolean(
  globalThis.__POSTGRES_READY__ && globalThis.__WEB_SERVER_READY__,
);
const describeIfIntegration = integrationReady ? describe : describe.skip;

beforeAll(async () => {
  if (!integrationReady) {
    return;
  }
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  if (!integrationReady) {
    return;
  }
  await database.query("DELETE FROM cargas;");
});

afterAll(async () => {
  if (!integrationReady) {
    return;
  }
  await database.query("DELETE FROM cargas;");
});

describeIfIntegration("GET /api/v1/cargas", () => {
  let authCookie: string;

  beforeAll(async () => {
    authCookie = await orchestrator.getAuthCookie();
  });

  test("should return empty array when no cargas exist", async () => {
    const response = await fetch("http://localhost:3000/api/v1/cargas", {
      headers: { cookie: authCookie },
    });

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

    const response = await fetch("http://localhost:3000/api/v1/cargas", {
      headers: { cookie: authCookie },
    });

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

    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?limit=2",
      {
        headers: { cookie: authCookie },
      },
    );

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
      { headers: { cookie: authCookie } },
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
      { headers: { cookie: authCookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas).toHaveLength(1);
    expect(responseBody.cargas[0].id_viagem).toBe("22222");
  });

  test("should respect limit parameter with notified=false", async () => {
    const carga1 = new Carga({ id_viagem: "11111", origem: "A" });
    const carga2 = new Carga({ id_viagem: "22222", origem: "B" });
    const carga3 = new Carga({ id_viagem: "33333", origem: "C" });

    await cargasRepository.save(carga1);
    await cargasRepository.save(carga2);
    await cargasRepository.save(carga3);

    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?notified=false&limit=2",
      { headers: { cookie: authCookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas).toHaveLength(2);
    expect(responseBody.pagination.limit).toBe(2);
    expect(responseBody.pagination.total).toBe(3);
  });

  test("should respect offset parameter with notified=false", async () => {
    const carga1 = new Carga({ id_viagem: "11111", origem: "A" });
    const carga2 = new Carga({ id_viagem: "22222", origem: "B" });

    await cargasRepository.save(carga1);
    await cargasRepository.save(carga2);

    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?notified=false&limit=1&offset=1",
      { headers: { cookie: authCookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas).toHaveLength(1);
    expect(responseBody.cargas[0].id_viagem).toBe("11111");
    expect(responseBody.pagination.offset).toBe(1);
    expect(responseBody.pagination.total).toBe(2);
  });

  test("should return correct pagination metadata with notified=false", async () => {
    const carga1 = new Carga({ id_viagem: "11111", origem: "A" });
    const carga2 = new Carga({ id_viagem: "22222", origem: "B" });

    await cargasRepository.save(carga1);
    await cargasRepository.save(carga2);
    await cargasRepository.markAsNotified("11111");

    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?notified=false&limit=5&offset=0",
      { headers: { cookie: authCookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas).toHaveLength(1);
    expect(responseBody.pagination).toEqual({
      total: 1,
      limit: 5,
      offset: 0,
    });
  });

  test("should return 400 for invalid limit parameter", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?limit=invalid",
      { headers: { cookie: authCookie } },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.error).toBeDefined();
  });

  test("should return 400 for negative offset", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?offset=-1",
      { headers: { cookie: authCookie } },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.error).toBeDefined();
  });

  test("should return cache headers and stable etag", async () => {
    await cargasRepository.save(
      new Carga({ id_viagem: "77777", origem: "SP" }),
    );

    const firstResponse = await fetch("http://localhost:3000/api/v1/cargas", {
      headers: { cookie: authCookie },
    });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers.get("cache-control")).toContain("private");
    expect(firstResponse.headers.get("x-response-time")).toMatch(/ms$/);
    expect(firstResponse.headers.get("etag")).toBeTruthy();

    const secondResponse = await fetch("http://localhost:3000/api/v1/cargas", {
      headers: { cookie: authCookie },
    });

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers.get("etag")).toBe(
      firstResponse.headers.get("etag"),
    );
  });

  test("should support selecting a subset of fields", async () => {
    await cargasRepository.save(
      new Carga({
        id_viagem: "88888",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
      }),
    );

    const response = await fetch(
      "http://localhost:3000/api/v1/cargas?fields=id_viagem,origem",
      { headers: { cookie: authCookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.cargas[0]).toMatchObject({
      id_viagem: "88888",
      origem: "Sao Paulo - SP",
    });
    expect(responseBody.cargas[0].destino).toBeUndefined();
  });
});
