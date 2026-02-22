import { load } from "cheerio";
import retry from "async-retry";
import type { ScrapedCargaInput } from "@notifica/shared/models/Carga";

function isTest() {
  return process.env.NODE_ENV === "test";
}

function getRequiredEnvVar(name: string) {
  const value = process.env[name];
  if (!value && !isTest()) {
    throw new Error(`${name} is required`);
  }
  return value || "";
}

async function withRetry<T>(fn: () => Promise<T>, operationName: string) {
  if (isTest()) {
    return fn();
  }

  return retry(fn, {
    retries: 5,
    factor: 2,
    minTimeout: 5000,
    maxTimeout: 30000,
    onRetry: (error: Error, attempt: number) => {
      console.log(
        `[TegmaScraper] Retry ${attempt} for ${operationName}: ${error.message}`,
      );
    },
  });
}

export const tegmaScraper = {
  async getCookie() {
    const baseUrl = getRequiredEnvVar("TEGMA_BASE_URL");

    return withRetry(async () => {
      const response = await fetch(`${baseUrl}/Login`, {
        method: "GET",
        redirect: "manual",
      });

      const setCookieHeader = response.headers.get("set-cookie");
      if (!setCookieHeader) {
        throw new Error("No set-cookie header received");
      }

      return setCookieHeader.split(";")[0] || "";
    }, "getCookie");
  },

  async login(cookie: string) {
    const baseUrl = getRequiredEnvVar("TEGMA_BASE_URL");
    const username = getRequiredEnvVar("TEGMA_USERNAME");
    const password = getRequiredEnvVar("TEGMA_PASSWORD");

    return withRetry(async () => {
      const formData = new URLSearchParams();
      formData.append("Usuario", username);
      formData.append("Senha", password);
      formData.append("Lembrar", "true");

      const response = await fetch(`${baseUrl}/Login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `${cookie};Usuario=${username};Senha=${password};`,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          Origin: baseUrl,
          Referer: `${baseUrl}/Login`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: formData,
        redirect: "manual",
      });

      const location = response.headers.get("location");
      const setCookieHeader = response.headers.get("set-cookie");

      const isSuccess =
        response.status === 302 &&
        (location?.includes("Painel") || location?.includes("Transportadora"));

      if (!isSuccess) {
        throw new Error(
          `Login failed: unexpected response status ${response.status}, location: ${location}`,
        );
      }

      if (setCookieHeader) {
        return setCookieHeader.split(";")[0] || cookie;
      }

      return cookie;
    }, "login");
  },

  async fetchCargasPage(cookie: string) {
    const baseUrl = getRequiredEnvVar("TEGMA_BASE_URL");
    const username = getRequiredEnvVar("TEGMA_USERNAME");
    const password = getRequiredEnvVar("TEGMA_PASSWORD");

    return withRetry(async () => {
      const response = await fetch(
        `${baseUrl}/Monitoramento/CargasDisponiveis?tpoeqp=0`,
        {
          method: "GET",
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            "Cache-Control": "max-age=0",
            Cookie: `${cookie};Usuario=${username};Senha=${password};`,
            Referer: `${baseUrl}/Painel/Transportadora`,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch cargas page: ${response.status} ${response.statusText}`,
        );
      }

      return response.text();
    }, "fetchCargasPage");
  },

  parseCargas(html: string) {
    const $ = load(html);
    const cargas: ScrapedCargaInput[] = [];

    const colunas: Array<keyof ScrapedCargaInput> = [
      "viagem",
      "tipoTransporte",
      "origem",
      "destino",
      "produto",
      "equipamento",
      "prevColeta",
      "qtdeEntregas",
      "vrFrete",
      "termino",
    ];

    $("#tblGridViagem tbody tr").each((_, element) => {
      const carga: Partial<ScrapedCargaInput> = {};
      const celulas = $(element).find("td");

      colunas.forEach((nomeColuna, i) => {
        carga[nomeColuna] = $(celulas).eq(i).text().trim();
      });

      if (carga.viagem) {
        cargas.push(carga as ScrapedCargaInput);
      }
    });

    return cargas;
  },

  async fetchCargas() {
    console.log("[TegmaScraper] Starting cargo fetch...");
    let cookie = await this.getCookie();
    cookie = await this.login(cookie);
    const html = await this.fetchCargasPage(cookie);
    const cargas = this.parseCargas(html);
    console.log(`[TegmaScraper] Found ${cargas.length} cargas`);
    return cargas;
  },
};
