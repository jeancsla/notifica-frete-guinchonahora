import whatsappNotifier from "services/whatsapp-notifier.js";
import Carga from "models/carga.js";

// Mock fetch globally
global.fetch = jest.fn();

describe("WhatsApp Notifier", () => {
  beforeEach(() => {
    fetch.mockClear();
    process.env.EVOLUTION_API_BASE_URL = "https://api.evolution.com";
    process.env.EVOLUTION_API_INSTANCE = "guincho2";
    process.env.EVOLUTION_API_KEY = "test-api-key";
    process.env.NOTIFY_JEAN_PHONE = "5512982301778";
    process.env.NOTIFY_JEFFERSON_PHONE = "5512996347190";
    process.env.NOTIFY_SEBASTIAO_PHONE = "5512996558925";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe("sendNotification", () => {
    test("should send message via Evolution API", async () => {
      fetch.mockResolvedValueOnce({
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

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.number).toBe(phone);
      expect(callBody.text).toContain("Da uma olhada no site da Mills:");
      expect(callBody.text).toContain("Sao Paulo - SP");
      expect(callBody.options.delay).toBe(1200);
    });

    test("should throw error when API returns non-ok status", async () => {
      fetch.mockResolvedValueOnce({
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
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      await expect(
        whatsappNotifier.sendNotification("5512982301778", carga),
      ).rejects.toThrow("Network error");
    });

    test("should throw error when EVOLUTION_API_BASE_URL is not set", async () => {
      delete process.env.EVOLUTION_API_BASE_URL;

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
      fetch.mockResolvedValueOnce({
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
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.number).toBe("5512982301778");
    });

    test("should throw error when NOTIFY_JEAN_PHONE is not set", async () => {
      delete process.env.NOTIFY_JEAN_PHONE;

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
      fetch.mockResolvedValueOnce({
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
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.number).toBe("5512996347190");
    });

    test("should throw error when NOTIFY_JEFFERSON_PHONE is not set", async () => {
      delete process.env.NOTIFY_JEFFERSON_PHONE;

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
      fetch.mockResolvedValueOnce({
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
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.number).toBe("5512996558925");
    });

    test("should throw error when NOTIFY_SEBASTIAO_PHONE is not set", async () => {
      delete process.env.NOTIFY_SEBASTIAO_PHONE;

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
      fetch.mockResolvedValueOnce({
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

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
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
