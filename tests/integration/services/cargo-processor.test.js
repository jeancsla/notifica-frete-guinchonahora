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
import cargoProcessor from "services/cargo-processor.js";
import tegmaScraper from "services/tegma-scraper.js";
import whatsappNotifier from "services/whatsapp-notifier.js";
import cargasRepository from "repositories/cargas-repository.js";
import database from "infra/database.js";
import Carga from "models/carga.js";
import orchestrator from "tests/orchestrator.bun.js";

// Mock dependencies
jest.mock("services/tegma-scraper.js", () => ({
  default: {
    fetchCargas: jest.fn(),
  },
}));

jest.mock("services/whatsapp-notifier.js", () => ({
  default: {
    notifyJean: jest.fn(),
    notifyJefferson: jest.fn(),
  },
}));

jest.mock("repositories/cargas-repository.js", () => ({
  default: {
    existsBatch: jest.fn(),
    save: jest.fn(),
    markAsNotified: jest.fn(),
  },
}));

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await orchestrator.waitForAllServices();
  await database.query("DELETE FROM cargas;");
});

afterAll(async () => {
  delete process.env.NODE_ENV;
});

afterEach(async () => {
  await database.query("DELETE FROM cargas;");
  jest.clearAllMocks();
});

describe("Cargo Processor", () => {
  describe("process", () => {
    test("should process new cargas and send notifications", async () => {
      const mockCargas = [
        {
          viagem: "12345",
          tipoTransporte: "Rodoviario",
          origem: "Sao Paulo - SP",
          destino: "Rio de Janeiro - RJ",
          produto: "Carga Geral",
          equipamento: " Truck",
          prevColeta: "15/02/2026",
          qtdeEntregas: "2",
          vrFrete: "R$ 1.500,00",
          termino: "15/02/2026 18:00",
        },
      ];

      tegmaScraper.fetchCargas.mockResolvedValue(mockCargas);
      cargasRepository.existsBatch.mockResolvedValue(new Set());
      cargasRepository.save.mockResolvedValue({ id: 1 });
      cargasRepository.markAsNotified.mockResolvedValue();
      whatsappNotifier.notifyJean.mockResolvedValue();
      whatsappNotifier.notifyJefferson.mockResolvedValue();

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(1);
      expect(tegmaScraper.fetchCargas).toHaveBeenCalled();
      expect(cargasRepository.existsBatch).toHaveBeenCalledWith(["12345"]);
      expect(cargasRepository.save).toHaveBeenCalled();
      expect(whatsappNotifier.notifyJean).toHaveBeenCalled();
      expect(whatsappNotifier.notifyJefferson).toHaveBeenCalled();
      expect(cargasRepository.markAsNotified).toHaveBeenCalledWith("12345");
    });

    test("should skip cargas that already exist", async () => {
      const mockCargas = [
        {
          viagem: "12345",
          origem: "Sao Paulo - SP",
          destino: "Rio de Janeiro - RJ",
        },
        {
          viagem: "67890",
          origem: "Belo Horizonte - MG",
          destino: "Salvador - BA",
        },
      ];

      tegmaScraper.fetchCargas.mockResolvedValue(mockCargas);
      cargasRepository.existsBatch.mockResolvedValue(new Set(["12345"]));
      cargasRepository.save.mockResolvedValue({ id: 2 });
      cargasRepository.markAsNotified.mockResolvedValue();
      whatsappNotifier.notifyJean.mockResolvedValue();
      whatsappNotifier.notifyJefferson.mockResolvedValue();

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(1);
      expect(cargasRepository.save).toHaveBeenCalledTimes(1);
      expect(whatsappNotifier.notifyJean).toHaveBeenCalledTimes(1);
    });

    test("should return 0 when no cargas are found", async () => {
      tegmaScraper.fetchCargas.mockResolvedValue([]);

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(0);
      expect(cargasRepository.save).not.toHaveBeenCalled();
      expect(whatsappNotifier.notifyJean).not.toHaveBeenCalled();
    });

    test("should return 0 when all cargas already exist", async () => {
      const mockCargas = [
        {
          viagem: "12345",
          origem: "Sao Paulo - SP",
        },
        {
          viagem: "67890",
          origem: "Belo Horizonte - MG",
        },
      ];

      tegmaScraper.fetchCargas.mockResolvedValue(mockCargas);
      cargasRepository.existsBatch.mockResolvedValue(
        new Set(["12345", "67890"]),
      );

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(0);
      expect(cargasRepository.save).not.toHaveBeenCalled();
    });

    test("should handle scraper errors", async () => {
      tegmaScraper.fetchCargas.mockRejectedValue(new Error("Network error"));

      await expect(cargoProcessor.process()).rejects.toThrow("Network error");
    });

    test("should continue processing if one notification fails", async () => {
      const mockCargas = [
        {
          viagem: "12345",
          origem: "Sao Paulo - SP",
          destino: "Rio de Janeiro - RJ",
        },
      ];

      tegmaScraper.fetchCargas.mockResolvedValue(mockCargas);
      cargasRepository.existsBatch.mockResolvedValue(new Set());
      cargasRepository.save.mockResolvedValue({ id: 1 });
      cargasRepository.markAsNotified.mockResolvedValue();
      whatsappNotifier.notifyJean.mockRejectedValue(new Error("API error"));
      whatsappNotifier.notifyJefferson.mockResolvedValue();

      // With fault-tolerant notifications, this should NOT throw
      const result = await cargoProcessor.process();

      // Should still process the carga (just with notification errors recorded)
      expect(result.processed).toBe(1);
      expect(result.new_cargas[0].notificationErrors).toBeDefined();
      expect(result.new_cargas[0].notificationErrors).toHaveLength(1);
      expect(result.new_cargas[0].notificationErrors[0].recipient).toBe("jean");
    });

    test("should convert scraped data to Carga model before saving", async () => {
      const mockCargas = [
        {
          viagem: "12345",
          tipoTransporte: "Rodoviario",
          origem: "Sao Paulo - SP",
          destino: "Rio de Janeiro - RJ",
          produto: "Carga Geral",
          equipamento: " Truck",
          prevColeta: "15/02/2026",
          qtdeEntregas: "2",
          vrFrete: "R$ 1.500,00",
          termino: "15/02/2026 18:00",
        },
      ];

      tegmaScraper.fetchCargas.mockResolvedValue(mockCargas);
      cargasRepository.existsBatch.mockResolvedValue(new Set());
      cargasRepository.save.mockResolvedValue({ id: 1 });
      cargasRepository.markAsNotified.mockResolvedValue();
      whatsappNotifier.notifyJean.mockResolvedValue();
      whatsappNotifier.notifyJefferson.mockResolvedValue();

      await cargoProcessor.process();

      const savedCarga = cargasRepository.save.mock.calls[0][0];
      expect(savedCarga).toBeInstanceOf(Carga);
      expect(savedCarga.id_viagem).toBe("12345");
      expect(savedCarga.origem).toBe("Sao Paulo - SP");
    });

    test("should process multiple cargas in order", async () => {
      const mockCargas = [
        { viagem: "11111", origem: "A" },
        { viagem: "22222", origem: "B" },
        { viagem: "33333", origem: "C" },
      ];

      tegmaScraper.fetchCargas.mockResolvedValue(mockCargas);
      cargasRepository.existsBatch.mockResolvedValue(new Set());
      cargasRepository.save.mockResolvedValue({ id: 1 });
      cargasRepository.markAsNotified.mockResolvedValue();
      whatsappNotifier.notifyJean.mockResolvedValue();
      whatsappNotifier.notifyJefferson.mockResolvedValue();

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(3);
      expect(cargasRepository.save).toHaveBeenCalledTimes(3);
      expect(cargasRepository.markAsNotified).toHaveBeenCalledTimes(3);
    });
  });
});
