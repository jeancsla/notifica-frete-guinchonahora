import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import tegmaScraper from "services/tegma-scraper";
import { asMock } from "tests/test-utils";

const fetchMock = asMock(jest.fn() as unknown as typeof fetch);
global.fetch = fetchMock as unknown as typeof fetch;

describe("Tegma Scraper", () => {
  beforeEach(() => {
    fetchMock.mockClear();
    // Set environment variables for tests and force no-retry mode.
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "test";
    env.TEGMA_BASE_URL = "https://test.example.com";
    env.TEGMA_USERNAME = "testuser";
    env.TEGMA_PASSWORD = "testpass";
  });

  afterEach(() => {
    const env = process.env as Record<string, string | undefined>;
    delete env.NODE_ENV;
    delete env.TEGMA_BASE_URL;
    delete env.TEGMA_USERNAME;
    delete env.TEGMA_PASSWORD;
  });

  describe("getCookie", () => {
    test("should return cookie from set-cookie header", async () => {
      fetchMock.mockResolvedValueOnce({
        headers: new Map([
          ["set-cookie", "ASP.NET_SessionId=abc123; path=/; HttpOnly"],
        ]),
        status: 200,
      });

      const cookie = await tegmaScraper.getCookie();

      expect(cookie).toBe("ASP.NET_SessionId=abc123");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/Login"),
        expect.objectContaining({
          method: "GET",
          redirect: "manual",
        }),
      );
    });

    test("should throw error when request fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(tegmaScraper.getCookie()).rejects.toThrow("Network error");
    });

    test("should throw error when no set-cookie header", async () => {
      fetchMock.mockResolvedValueOnce({
        headers: new Map(),
        status: 200,
      });

      await expect(tegmaScraper.getCookie()).rejects.toThrow();
    });
  });

  describe("login", () => {
    test("should authenticate with credentials and return updated cookie on redirect", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 302,
        headers: new Map([
          ["location", "https://test.example.com/Painel/Transportadora"],
        ]),
      });

      const cookie = "ASP.NET_SessionId=abc123";
      const result = await tegmaScraper.login(cookie);

      expect(result).toBe(cookie); // Returns original cookie when no new cookie set
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/Login"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Cookie: expect.stringContaining(cookie),
          }),
        }),
      );

      type FetchInit = Parameters<typeof fetch>[1];
      const callArgs = fetchMock.mock.calls[0] as [string, FetchInit];
      const body = callArgs[1]?.body as URLSearchParams;
      expect(body.get("Usuario")).toBe("testuser");
      expect(body.get("Senha")).toBe("testpass");
    });

    test("should return new cookie when server sets one during login", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 302,
        headers: new Map([
          ["location", "https://test.example.com/Painel/Transportadora"],
          ["set-cookie", "ASP.NET_SessionId=newcookie456; path=/; HttpOnly"],
        ]),
      });

      const cookie = "ASP.NET_SessionId=abc123";
      const result = await tegmaScraper.login(cookie);

      expect(result).toBe("ASP.NET_SessionId=newcookie456");
    });

    test("should throw error when login returns non-redirect status", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        headers: new Map(),
      });

      await expect(tegmaScraper.login("cookie")).rejects.toThrow(
        "Login failed: unexpected response status 200",
      );
    });

    test("should throw error when login redirect is not to expected location", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 302,
        headers: new Map([
          ["location", "https://test.example.com/Login?error=invalid"],
        ]),
      });

      await expect(tegmaScraper.login("cookie")).rejects.toThrow(
        "Login failed: unexpected response status 302",
      );
    });

    test("should throw error when fetch fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(tegmaScraper.login("cookie")).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("fetchCargasPage", () => {
    test("should fetch cargas page with correct headers", async () => {
      const html = "<html><body>Test</body></html>";
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => html,
      });

      const cookie = "ASP.NET_SessionId=abc123";
      const result = await tegmaScraper.fetchCargasPage(cookie);

      expect(result).toBe(html);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/Monitoramento/CargasDisponiveis"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Cookie: expect.stringContaining(cookie),
          }),
        }),
      );
    });

    test("should throw error when fetch fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Fetch failed"));

      await expect(tegmaScraper.fetchCargasPage("cookie")).rejects.toThrow(
        "Fetch failed",
      );
    });
  });

  describe("parseCargas", () => {
    test("should parse cargas from HTML table", () => {
      const html = `
        <html>
          <body>
            <table id="tblGridViagem">
              <tbody>
                <tr>
                  <td>12345</td>
                  <td>Rodoviario</td>
                  <td>Sao Paulo - SP</td>
                  <td>Rio de Janeiro - RJ</td>
                  <td>Carga Geral</td>
                  <td> Truck</td>
                  <td>15/02/2026</td>
                  <td>2</td>
                  <td>R$ 1.500,00</td>
                  <td>15/02/2026 18:00</td>
                </tr>
                <tr>
                  <td>67890</td>
                  <td>Aereo</td>
                  <td>Belo Horizonte - MG</td>
                  <td>Salvador - BA</td>
                  <td>Eletronicos</td>
                  <td>Van</td>
                  <td>20/02/2026</td>
                  <td>1</td>
                  <td>R$ 2.000,00</td>
                  <td>20/02/2026 12:00</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const cargas = tegmaScraper.parseCargas(html);

      expect(cargas).toHaveLength(2);

      expect(cargas[0]).toEqual({
        viagem: "12345",
        tipoTransporte: "Rodoviario",
        origem: "Sao Paulo - SP",
        destino: "Rio de Janeiro - RJ",
        produto: "Carga Geral",
        equipamento: "Truck",
        prevColeta: "15/02/2026",
        qtdeEntregas: "2",
        vrFrete: "R$ 1.500,00",
        termino: "15/02/2026 18:00",
      });

      expect(cargas[1]).toEqual({
        viagem: "67890",
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
    });

    test("should return empty array when table is not found", () => {
      const html = "<html><body>No table here</body></html>";

      const cargas = tegmaScraper.parseCargas(html);

      expect(cargas).toEqual([]);
    });

    test("should return empty array when tbody is empty", () => {
      const html = `
        <html>
          <body>
            <table id="tblGridViagem">
              <tbody></tbody>
            </table>
          </body>
        </html>
      `;

      const cargas = tegmaScraper.parseCargas(html);

      expect(cargas).toEqual([]);
    });

    test("should handle rows with missing cells", () => {
      const html = `
        <html>
          <body>
            <table id="tblGridViagem">
              <tbody>
                <tr>
                  <td>12345</td>
                  <td>Rodoviario</td>
                  <td>Sao Paulo</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const cargas = tegmaScraper.parseCargas(html);

      expect(cargas).toHaveLength(1);
      expect(cargas[0].viagem).toBe("12345");
      expect(cargas[0].tipoTransporte).toBe("Rodoviario");
      expect(cargas[0].origem).toBe("Sao Paulo");
      expect(cargas[0].destino).toBe("");
    });
  });

  describe("fetchCargas (integration)", () => {
    test("should orchestrate full flow", async () => {
      const html = `
        <table id="tblGridViagem">
          <tbody>
            <tr>
              <td>12345</td>
              <td>Rodoviario</td>
              <td>Sao Paulo - SP</td>
              <td>Rio de Janeiro - RJ</td>
              <td>Carga Geral</td>
              <td> Truck</td>
              <td>15/02/2026</td>
              <td>2</td>
              <td>R$ 1.500,00</td>
              <td>15/02/2026 18:00</td>
            </tr>
          </tbody>
        </table>
      `;

      // Mock getCookie
      fetchMock.mockResolvedValueOnce({
        headers: new Map([
          ["set-cookie", "ASP.NET_SessionId=abc123; path=/; HttpOnly"],
        ]),
        status: 200,
      });

      // Mock login - returns 302 redirect on success
      fetchMock.mockResolvedValueOnce({
        status: 302,
        headers: new Map([
          ["location", "https://test.example.com/Painel/Transportadora"],
        ]),
      });

      // Mock fetchCargasPage
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => html,
      });

      const cargas = await tegmaScraper.fetchCargas();

      expect(cargas).toHaveLength(1);
      expect(cargas[0].viagem).toBe("12345");
    });
  });
});
