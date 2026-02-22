import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from "bun:test";
import cargoProcessor from "services/cargo-processor";
import tegmaScraper from "services/tegma-scraper";
import whatsappNotifier from "services/whatsapp-notifier";
import cargasRepository from "repositories/cargas-repository";
import Carga from "@notifica/shared/models/Carga";
import { asMock } from "tests/test-utils";

beforeAll(async () => {
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "test";
});

afterAll(async () => {
  const env = process.env as Record<string, string | undefined>;
  delete env.NODE_ENV;
});

afterEach(() => {
  (jest as unknown as { restoreAllMocks: () => void }).restoreAllMocks();
});

describe("Cargo Processor", () => {
  describe("process", () => {
    test("should process new cargas and send notifications", async () => {
      const fetchCargasMock = asMock(jest.spyOn(tegmaScraper, "fetchCargas"));
      const existsBatchMock = asMock(
        jest.spyOn(cargasRepository, "existsBatch"),
      );
      const saveMock = asMock(jest.spyOn(cargasRepository, "save"));
      const markAsNotifiedMock = asMock(
        jest.spyOn(cargasRepository, "markAsNotified"),
      );
      const notifyJeanMock = asMock(jest.spyOn(whatsappNotifier, "notifyJean"));
      const notifyJeffersonMock = asMock(
        jest.spyOn(whatsappNotifier, "notifyJefferson"),
      );

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

      fetchCargasMock.mockResolvedValue(mockCargas);
      existsBatchMock.mockResolvedValue(new Set());
      saveMock.mockResolvedValue({ id: 1 });
      markAsNotifiedMock.mockResolvedValue(undefined);
      notifyJeanMock.mockResolvedValue(undefined);
      notifyJeffersonMock.mockResolvedValue(undefined);

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(1);
      expect(fetchCargasMock).toHaveBeenCalled();
      expect(existsBatchMock).toHaveBeenCalledWith(["12345"]);
      expect(saveMock).toHaveBeenCalled();
      expect(notifyJeanMock).toHaveBeenCalled();
      expect(notifyJeffersonMock).toHaveBeenCalled();
      expect(markAsNotifiedMock).toHaveBeenCalledWith("12345");
    });

    test("should skip cargas that already exist", async () => {
      const fetchCargasMock = asMock(jest.spyOn(tegmaScraper, "fetchCargas"));
      const existsBatchMock = asMock(
        jest.spyOn(cargasRepository, "existsBatch"),
      );
      const saveMock = asMock(jest.spyOn(cargasRepository, "save"));
      const markAsNotifiedMock = asMock(
        jest.spyOn(cargasRepository, "markAsNotified"),
      );
      const notifyJeanMock = asMock(jest.spyOn(whatsappNotifier, "notifyJean"));
      const notifyJeffersonMock = asMock(
        jest.spyOn(whatsappNotifier, "notifyJefferson"),
      );

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

      fetchCargasMock.mockResolvedValue(mockCargas);
      existsBatchMock.mockResolvedValue(new Set(["12345"]));
      saveMock.mockResolvedValue({ id: 2 });
      markAsNotifiedMock.mockResolvedValue(undefined);
      notifyJeanMock.mockResolvedValue(undefined);
      notifyJeffersonMock.mockResolvedValue(undefined);

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(1);
      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(notifyJeanMock).toHaveBeenCalledTimes(1);
    });

    test("should return 0 when no cargas are found", async () => {
      const fetchCargasMock = asMock(jest.spyOn(tegmaScraper, "fetchCargas"));
      const saveMock = asMock(jest.spyOn(cargasRepository, "save"));
      const notifyJeanMock = asMock(jest.spyOn(whatsappNotifier, "notifyJean"));

      fetchCargasMock.mockResolvedValue([]);

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(0);
      expect(saveMock).not.toHaveBeenCalled();
      expect(notifyJeanMock).not.toHaveBeenCalled();
    });

    test("should return 0 when all cargas already exist", async () => {
      const fetchCargasMock = asMock(jest.spyOn(tegmaScraper, "fetchCargas"));
      const existsBatchMock = asMock(
        jest.spyOn(cargasRepository, "existsBatch"),
      );
      const saveMock = asMock(jest.spyOn(cargasRepository, "save"));

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

      fetchCargasMock.mockResolvedValue(mockCargas);
      existsBatchMock.mockResolvedValue(new Set(["12345", "67890"]));

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(0);
      expect(saveMock).not.toHaveBeenCalled();
    });

    test("should handle scraper errors", async () => {
      const fetchCargasMock = asMock(jest.spyOn(tegmaScraper, "fetchCargas"));

      fetchCargasMock.mockRejectedValue(new Error("Network error"));

      await expect(cargoProcessor.process()).rejects.toThrow("Network error");
    });

    test("should continue processing if one notification fails", async () => {
      const fetchCargasMock = asMock(jest.spyOn(tegmaScraper, "fetchCargas"));
      const existsBatchMock = asMock(
        jest.spyOn(cargasRepository, "existsBatch"),
      );
      const saveMock = asMock(jest.spyOn(cargasRepository, "save"));
      const markAsNotifiedMock = asMock(
        jest.spyOn(cargasRepository, "markAsNotified"),
      );
      const notifyJeanMock = asMock(jest.spyOn(whatsappNotifier, "notifyJean"));
      const notifyJeffersonMock = asMock(
        jest.spyOn(whatsappNotifier, "notifyJefferson"),
      );

      const mockCargas = [
        {
          viagem: "12345",
          origem: "Sao Paulo - SP",
          destino: "Rio de Janeiro - RJ",
        },
      ];

      fetchCargasMock.mockResolvedValue(mockCargas);
      existsBatchMock.mockResolvedValue(new Set());
      saveMock.mockResolvedValue({ id: 1 });
      markAsNotifiedMock.mockResolvedValue(undefined);
      notifyJeanMock.mockRejectedValue(new Error("API error"));
      notifyJeffersonMock.mockResolvedValue(undefined);

      // With fault-tolerant notifications, this should NOT throw
      const result = await cargoProcessor.process();

      // Should still process the carga (just with notification errors recorded)
      expect(result.processed).toBe(1);
      const notificationErrors = result.new_cargas[0]?.notificationErrors ?? [];
      expect(notificationErrors).toBeDefined();
      expect(notificationErrors).toHaveLength(1);
      expect(notificationErrors[0]?.recipient).toBe("jean");
    });

    test("should convert scraped data to Carga model before saving", async () => {
      const fetchCargasMock = asMock(jest.spyOn(tegmaScraper, "fetchCargas"));
      const existsBatchMock = asMock(
        jest.spyOn(cargasRepository, "existsBatch"),
      );
      const saveMock = asMock(jest.spyOn(cargasRepository, "save"));
      const markAsNotifiedMock = asMock(
        jest.spyOn(cargasRepository, "markAsNotified"),
      );
      const notifyJeanMock = asMock(jest.spyOn(whatsappNotifier, "notifyJean"));
      const notifyJeffersonMock = asMock(
        jest.spyOn(whatsappNotifier, "notifyJefferson"),
      );

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

      fetchCargasMock.mockResolvedValue(mockCargas);
      existsBatchMock.mockResolvedValue(new Set());
      saveMock.mockResolvedValue({ id: 1 });
      markAsNotifiedMock.mockResolvedValue(undefined);
      notifyJeanMock.mockResolvedValue(undefined);
      notifyJeffersonMock.mockResolvedValue(undefined);

      await cargoProcessor.process();

      const savedCarga = saveMock.mock.calls[0]?.[0] as Carga | undefined;
      expect(savedCarga).toBeDefined();
      expect(savedCarga).toBeInstanceOf(Carga);
      expect(savedCarga?.id_viagem).toBe("12345");
      expect(savedCarga?.origem).toBe("Sao Paulo - SP");
    });

    test("should process multiple cargas in order", async () => {
      const fetchCargasMock = asMock(jest.spyOn(tegmaScraper, "fetchCargas"));
      const existsBatchMock = asMock(
        jest.spyOn(cargasRepository, "existsBatch"),
      );
      const saveMock = asMock(jest.spyOn(cargasRepository, "save"));
      const markAsNotifiedMock = asMock(
        jest.spyOn(cargasRepository, "markAsNotified"),
      );
      const notifyJeanMock = asMock(jest.spyOn(whatsappNotifier, "notifyJean"));
      const notifyJeffersonMock = asMock(
        jest.spyOn(whatsappNotifier, "notifyJefferson"),
      );

      const mockCargas = [
        { viagem: "11111", origem: "A" },
        { viagem: "22222", origem: "B" },
        { viagem: "33333", origem: "C" },
      ];

      fetchCargasMock.mockResolvedValue(mockCargas);
      existsBatchMock.mockResolvedValue(new Set());
      saveMock.mockResolvedValue({ id: 1 });
      markAsNotifiedMock.mockResolvedValue(undefined);
      notifyJeanMock.mockResolvedValue(undefined);
      notifyJeffersonMock.mockResolvedValue(undefined);

      const result = await cargoProcessor.process();

      expect(result.processed).toBe(3);
      expect(saveMock).toHaveBeenCalledTimes(3);
      expect(markAsNotifiedMock).toHaveBeenCalledTimes(3);
    });
  });
});
