import { describe, expect, test } from "bun:test";
import Carga from "@notifica/shared/models/Carga";

describe("Carga Model", () => {
  describe("constructor", () => {
    test("should create a Carga instance with all fields", () => {
      const data = {
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
      };

      const carga = new Carga(data);

      expect(carga.id_viagem).toBe("12345");
      expect(carga.tipoTransporte).toBe("Transporte Rodoviario");
      expect(carga.origem).toBe("Sao Paulo - SP");
      expect(carga.destino).toBe("Rio de Janeiro - RJ");
      expect(carga.produto).toBe("Carga Geral");
      expect(carga.equipamento).toBe(" Truck");
      expect(carga.prevColeta).toBe("15/02/2026");
      expect(carga.qtdeEntregas).toBe("2");
      expect(carga.vrFrete).toBe("R$ 1.500,00");
      expect(carga.termino).toBe("15/02/2026 18:00");
    });

    test("should create a Carga instance with partial fields", () => {
      const data = {
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
      };

      const carga = new Carga(data);

      expect(carga.id_viagem).toBe("12345");
      expect(carga.origem).toBe("Sao Paulo - SP");
      expect(carga.destino).toBe("Rio de Janeiro - RJ");
      expect(carga.tipoTransporte).toBeUndefined();
      expect(carga.produto).toBeUndefined();
    });
  });

  describe("isValid", () => {
    test("should return true when id_viagem is valid", () => {
      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      expect(carga.isValid()).toBe(true);
    });

    test("should return false when id_viagem is empty string", () => {
      const carga = new Carga({
        id_viagem: "",
        origem: "Sao Paulo - SP",
      });

      expect(carga.isValid()).toBe(false);
    });

    test("should return false when id_viagem is undefined", () => {
      const carga = new Carga({
        id_viagem: undefined as unknown as string,
        origem: "Sao Paulo - SP",
      });

      expect(carga.isValid()).toBe(false);
    });

    test("should return false when id_viagem is null", () => {
      const carga = new Carga({
        id_viagem: null as unknown as string,
        origem: "Sao Paulo - SP",
      });

      expect(carga.isValid()).toBe(false);
    });
  });

  describe("toWhatsAppMessage", () => {
    test("should format message with all fields", () => {
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

      const message = carga.toWhatsAppMessage();

      expect(message).toContain("Da uma olhada no site da Mills:");
      expect(message).toContain("De: Sao Paulo - SP");
      expect(message).toContain("Para: Rio de Janeiro - RJ");
      expect(message).toContain("Produto: Carga Geral");
      expect(message).toContain("Veiculo:  Truck");
      expect(message).toContain("Previsao de Coleta: 15/02/2026");
      expect(message).toContain(
        "https://gestaotegmatransporte.ventunolog.com.br/Login",
      );
    });

    test("should format message with missing fields showing N/A", () => {
      const carga = new Carga({
        id_viagem: "12345",
        origem: "Sao Paulo - SP",
      });

      const message = carga.toWhatsAppMessage();

      expect(message).toContain("De: Sao Paulo - SP");
      expect(message).toContain("Para: N/A");
      expect(message).toContain("Produto: N/A");
    });
  });

  describe("toDatabase", () => {
    test("should convert to database format with snake_case keys", () => {
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

      const dbData = carga.toDatabase();

      expect(dbData).toEqual({
        id_viagem: "12345",
        tipo_transporte: "Transporte Rodoviario",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
        equipamento: " Truck",
        prev_coleta: "15/02/2026",
        qtd_entregas: "2",
        vr_frete: "R$ 1.500,00",
        termino: "15/02/2026 18:00",
      });
    });
  });

  describe("fromScrapedData", () => {
    test("should create Carga from scraped data with correct mapping", () => {
      const scrapedData = {
        viagem: "67890",
        tipoTransporte: "Transporte Aereo",
        origem: "Belo Horizonte - MG",
        destino: "Salvador - BA",
        produto: "Eletronicos",
        equipamento: "Van",
        prevColeta: "20/02/2026",
        qtdeEntregas: "1",
        vrFrete: "R$ 2.000,00",
        termino: "20/02/2026 12:00",
      };

      const carga = Carga.fromScrapedData(scrapedData);

      expect(carga).toBeInstanceOf(Carga);
      expect(carga.id_viagem).toBe("67890");
      expect(carga.tipoTransporte).toBe("Transporte Aereo");
      expect(carga.origem).toBe("Belo Horizonte - MG");
      expect(carga.destino).toBe("Salvador - BA");
      expect(carga.produto).toBe("Eletronicos");
      expect(carga.equipamento).toBe("Van");
      expect(carga.prevColeta).toBe("20/02/2026");
      expect(carga.qtdeEntregas).toBe("1");
      expect(carga.vrFrete).toBe("R$ 2.000,00");
      expect(carga.termino).toBe("20/02/2026 12:00");
    });
  });
});
