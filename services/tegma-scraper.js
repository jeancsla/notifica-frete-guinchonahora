import { load } from "cheerio";
import retry from "async-retry";

function isTest() {
  return process.env.NODE_ENV === "test";
}

function getEnvVar(name) {
  return process.env[name];
}

function getRequiredEnvVar(name) {
  const value = process.env[name];
  if (!value && !isTest()) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function withRetry(fn, operationName) {
  // Skip retry in test mode
  if (isTest()) {
    return fn();
  }

  return retry(fn, {
    retries: 5,
    factor: 2,
    minTimeout: 5000,
    maxTimeout: 30000,
    onRetry: (error, attempt) => {
      console.log(
        `[TegmaScraper] Retry ${attempt} for ${operationName}: ${error.message}`,
      );
    },
  });
}

const tegmaScraper = {
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

      // Extract just the session cookie part (before the first semicolon)
      const cookie = setCookieHeader.split(";")[0];
      return cookie;
    }, "getCookie");
  },

  async login(cookie) {
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

      // Check for successful login (redirect to dashboard or specific cookie)
      const location = response.headers.get("location");
      const setCookieHeader = response.headers.get("set-cookie");

      // Login success indicators: redirect to Painel or new session cookie
      const isSuccess =
        response.status === 302 &&
        (location?.includes("Painel") || location?.includes("Transportadora"));

      if (!isSuccess) {
        throw new Error(
          `Login failed: unexpected response status ${response.status}, location: ${location}`,
        );
      }

      // Return updated cookie if server set new cookies
      if (setCookieHeader) {
        const newCookie = setCookieHeader.split(";")[0];
        return newCookie;
      }

      return cookie;
    }, "login");
  },

  async fetchCargasPage(cookie) {
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

  parseCargas(html) {
    const $ = load(html);
    const cargas = [];

    const colunas = [
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

    $("#tblGridViagem tbody tr").each((index, element) => {
      const carga = {};
      const celulas = $(element).find("td");

      colunas.forEach((nomeColuna, i) => {
        carga[nomeColuna] = $(celulas).eq(i).text().trim();
      });

      cargas.push(carga);
    });

    return cargas;
  },

  async fetchCargas() {
    console.log("[TegmaScraper] Starting cargo fetch...");

    // Step 1: Get initial cookie
    console.log("[TegmaScraper] Getting cookie...");
    let cookie = await this.getCookie();

    // Step 2: Login (may return updated cookie)
    console.log("[TegmaScraper] Logging in...");
    cookie = await this.login(cookie);

    // Step 3: Fetch cargas page (use potentially updated cookie)
    console.log("[TegmaScraper] Fetching cargas page...");
    const html = await this.fetchCargasPage(cookie);

    // Step 4: Parse cargas
    console.log("[TegmaScraper] Parsing cargas...");
    const cargas = this.parseCargas(html);

    console.log(`[TegmaScraper] Found ${cargas.length} cargas`);
    return cargas;
  },
};

export default tegmaScraper;
