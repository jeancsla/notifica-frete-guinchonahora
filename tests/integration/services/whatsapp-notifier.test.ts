import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import whatsappNotifier from "services/whatsapp-notifier";
import Carga from "@notifica/shared/models/Carga";
import { asMock } from "tests/test-utils";

const fetchMock = asMock(jest.fn() as unknown as typeof fetch);
global.fetch = fetchMock as unknown as typeof fetch;

function getCallBody() {
  type FetchInit = Parameters<typeof fetch>[1];
  const callArgs = fetchMock.mock.calls[0] as [string, FetchInit];
  const rawBody = String(callArgs[1]?.body ?? "");
  return JSON.parse(rawBody) as {
    number?: string;
    text?: string;
    options?: { delay?: number };
  };
}

describe("WhatsApp Notifier", () => {
  beforeEach(() => {
    fetchMock.mockClear();
    const env = process.env as Record<string, string | undefined>;
    env.EVOLUTION_API_BASE_URL = "https://api.evolution.com";
    env.EVOLUTION_API_INSTANCE = "guincho2";
    env.EVOLUTION_API_KEY = "test-api-key";
    env.NOTIFY_JEAN_PHONE = "5512982301778";
    env.NOTIFY_JEFFERSON_PHONE = "5512996347190";
    env.NOTIFY_SEBASTIAO_PHONE = "5512996558925";
    env.NODE_ENV = "test";
  });

  afterEach(() => {
    const env = process.env as Record<string, string | undefined>;
    delete env.NODE_ENV;
  });

  describe("sendNotification", () => {
    test("should send message via Evolution API", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
        equipamento: " Truck",
        prevColeta: "15/02/2026",
      });

      const phone = "5512982301778";
      await whatsappNotifier.sendNotification(phone, carga);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.evolution.com/message/sendText/guincho2",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            apikey: "test-api-key",
          }),
          body: expect.any(String),
        }),
      );

      const callBody = getCallBody();
      expect(callBody.number).toBe(phone);
      expect(callBody.text).toContain("Da uma olhada no site da Mills:");
      expect(callBody.text).toContain("Sao Paulo - SP");
      expect(callBody.options?.delay).toBe(1200);
    });

    test("should throw error when API returns non-ok status", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 400,
        text: async () => "Bad Request",
      });

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      await expect(
        whatsappNotifier.sendNotification("5512982301778", carga),
      ).rejects.toThrow();
    });

    test("should throw error when fetch fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      await expect(
        whatsappNotifier.sendNotification("5512982301778", carga),
      ).rejects.toThrow("Network error");
    });

    test("should throw error when EVOLUTION_API_BASE_URL is not set", async () => {
      const env = process.env as Record<string, string | undefined>;
      delete env.EVOLUTION_API_BASE_URL;

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      await expect(
        whatsappNotifier.sendNotification("5512982301778", carga),
      ).rejects.toThrow();
    });
  });

  describe("notifyJean", () => {
    test("should send notification to Jean's phone", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
        equipamento: " Truck",
        prevColeta: "15/02/2026",
      });

      await whatsappNotifier.notifyJean(carga);

      expect(fetch).toHaveBeenCalled();
      const callBody = getCallBody();
      expect(callBody.number).toBe("5512982301778");
    });

    test("should throw error when NOTIFY_JEAN_PHONE is not set", async () => {
      const env = process.env as Record<string, string | undefined>;
      delete env.NOTIFY_JEAN_PHONE;

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      await expect(whatsappNotifier.notifyJean(carga)).rejects.toThrow(
        "Jean phone number not configured",
      );
    });
  });

  describe("notifyJefferson", () => {
    test("should send notification to Jefferson's phone", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
        equipamento: " Truck",
        prevColeta: "15/02/2026",
      });

      await whatsappNotifier.notifyJefferson(carga);

      expect(fetch).toHaveBeenCalled();
      const callBody = getCallBody();
      expect(callBody.number).toBe("5512996347190");
    });

    test("should throw error when NOTIFY_JEFFERSON_PHONE is not set", async () => {
      const env = process.env as Record<string, string | undefined>;
      delete env.NOTIFY_JEFFERSON_PHONE;

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      await expect(whatsappNotifier.notifyJefferson(carga)).rejects.toThrow(
        "Jefferson phone number not configured",
      );
    });
  });

  describe("notifySebastiao", () => {
    test("should send notification to Sebastiao's phone", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
        equipamento: " Truck",
        prevColeta: "15/02/2026",
      });

      await whatsappNotifier.notifySebastiao(carga);

      expect(fetch).toHaveBeenCalled();
      const callBody = getCallBody();
      expect(callBody.number).toBe("5512996558925");
    });

    test("should throw error when NOTIFY_SEBASTIAO_PHONE is not set", async () => {
      const env = process.env as Record<string, string | undefined>;
      delete env.NOTIFY_SEBASTIAO_PHONE;

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      await expect(whatsappNotifier.notifySebastiao(carga)).rejects.toThrow(
        "Sebastiao phone number not configured",
      );
    });
  });

  describe("message formatting", () => {
    test("should format message correctly with all cargo data", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
        equipamento: " Truck",
        prevColeta: "15/02/2026 08:00",
      });

      await whatsappNotifier.notifyJean(carga);

      const callBody = getCallBody();
      expect(callBody.text).toBe(
        "Da uma olhada no site da Mills:\n" +
          "De: Sao Paulo - SP\n" +
          "Para: Rio de Janeiro - RJ\n" +
          "Produto: Carga Geral\n" +
          "Veiculo:  Truck\n" +
          "Previsao de Coleta: 15/02/2026 08:00\n" +
          "https://gestaotegmatransporte.ventunolog.com.br/Login",
      );
    });
  });
});
