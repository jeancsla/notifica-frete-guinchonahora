import { load } from "cheerio";
import retry from "async-retry";
import type { ScrapedCargaInput } from "@notifica/shared/models/Carga";
import { logger } from "../lib/logger";
import {
  getCircuitBreaker,
  CircuitBreakerOpenError,
} from "../lib/circuit-breaker";
import { tegmaScrapeDuration } from "../lib/metrics";

const log = logger.child({ component: "tegma_scraper" });

// Circuit breaker for Tegma external API
const circuitBreaker = getCircuitBreaker("tegma_api", {
  failureThreshold: 3, // Open after 3 failures
  resetTimeoutMs: 60000, // Try again after 1 minute
  halfOpenMaxCalls: 2,
});

function isTest() {
  return process.env.NODE_ENV === "test";
}

function getFetchTimeoutMs() {
  return Math.max(
    5000,
    parseInt(process.env.TEGMA_FETCH_TIMEOUT_MS || "30000", 10),
  );
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: globalThis.RequestInit = {},
  timeoutMs = getFetchTimeoutMs(),
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
      log.warn("tegma_scraper.retry", {
        attempt,
        operation: operationName,
        error,
      });
    },
  });
}

export const tegmaScraper = {
  async getCookie() {
    const baseUrl = getRequiredEnvVar("TEGMA_BASE_URL");

    return withRetry(async () => {
      const response = await fetchWithTimeout(`${baseUrl}/Login`, {
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

      const response = await fetchWithTimeout(`${baseUrl}/Login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // EC-8: Use session cookie only, not credentials in headers
          Cookie: cookie,
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

    return withRetry(async () => {
      const response = await fetchWithTimeout(
        `${baseUrl}/Monitoramento/CargasDisponiveis?tpoeqp=0`,
        {
          method: "GET",
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            "Cache-Control": "max-age=0",
            // EC-8: Use session cookie only, credentials already authenticated
            Cookie: cookie,
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
    log.info("tegma_scraper.fetch.start");
    const start = performance.now();

    try {
      const cargas = await circuitBreaker.execute(async () => {
        let cookie = await this.getCookie();
        cookie = await this.login(cookie);
        const html = await this.fetchCargasPage(cookie);
        return this.parseCargas(html);
      });

      const durationSeconds = (performance.now() - start) / 1000;
      tegmaScrapeDuration.observe(durationSeconds);
      log.info("tegma_scraper.fetch.completed", {
        count: cargas.length,
        duration_seconds: durationSeconds,
      });
      return cargas;
    } catch (error) {
      const durationSeconds = (performance.now() - start) / 1000;
      tegmaScrapeDuration.observe(durationSeconds);
      if (error instanceof CircuitBreakerOpenError) {
        log.warn("tegma_scraper.circuit_breaker_open", {
          state: circuitBreaker.getState(),
        });
      }
      throw error;
    }
  },

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics() {
    return circuitBreaker.getMetrics();
  },
};
