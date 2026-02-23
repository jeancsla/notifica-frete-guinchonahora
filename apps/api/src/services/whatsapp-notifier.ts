import retry from "async-retry";
import type { Carga } from "@notifica/shared/models/Carga";
import type { NotificationRecipient } from "@notifica/shared/types";
import { logger } from "../lib/logger";
import { getCircuitBreaker, CircuitBreakerOpenError } from "../lib/circuit-breaker";

const log = logger.child({ component: "whatsapp_notifier" });

// Circuit breaker for Evolution API
const circuitBreaker = getCircuitBreaker("evolution_api", {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenMaxCalls: 2,
});

function isTest() {
  return process.env.NODE_ENV === "test";
}

function getEnvVar(name: string) {
  return process.env[name] || "";
}

function getFetchTimeoutMs() {
  return Math.max(
    5000,
    parseInt(process.env.EVOLUTION_API_TIMEOUT_MS || "30000", 10),
  );
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
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
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse notification recipients from environment.
 * Supports both JSON format (NOTIFICATION_RECIPIENTS) and legacy individual vars.
 */
function parseRecipients(): NotificationRecipient[] {
  // Try JSON config first
  const jsonConfig = getEnvVar("NOTIFICATION_RECIPIENTS");
  if (jsonConfig) {
    try {
      const parsed = JSON.parse(jsonConfig) as NotificationRecipient[];
      if (Array.isArray(parsed) && parsed.every((r) => r.name && r.phone)) {
        return parsed;
      }
      log.warn("whatsapp_notifier.invalid_json_recipients");
    } catch {
      log.warn("whatsapp_notifier.failed_to_parse_json_recipients");
    }
  }

  // Fallback to legacy individual env vars
  const recipients: NotificationRecipient[] = [];

  const jeanPhone = getEnvVar("NOTIFY_JEAN_PHONE");
  if (jeanPhone) {
    recipients.push({ name: "jean", phone: jeanPhone });
  }

  const jeffersonPhone = getEnvVar("NOTIFY_JEFFERSON_PHONE");
  if (jeffersonPhone) {
    recipients.push({ name: "jefferson", phone: jeffersonPhone });
  }

  const sebastiaoPhone = getEnvVar("NOTIFY_SEBASTIAO_PHONE");
  if (sebastiaoPhone) {
    recipients.push({ name: "sebastiao", phone: sebastiaoPhone });
  }

  return recipients;
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
      log.warn("whatsapp_notifier.retry", {
        attempt,
        operation: operationName,
        error,
      });
    },
  });
}

export const whatsappNotifier = {
  async sendNotification(
    phone: string,
    carga: Carga,
    recipient: string = "unknown",
  ) {
    const apiBaseUrl = getEnvVar("EVOLUTION_API_BASE_URL");
    if (!apiBaseUrl) {
      throw new Error("EVOLUTION_API_BASE_URL not configured");
    }

    const apiInstance = getEnvVar("EVOLUTION_API_INSTANCE");
    const apiKey = getEnvVar("EVOLUTION_API_KEY");

    // Circuit breaker wrapper around the retry logic
    return circuitBreaker.execute(() =>
      withRetry(async () => {
        const url = `${apiBaseUrl}/message/sendText/${apiInstance}`;

        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
          body: JSON.stringify({
            number: phone,
            text: carga.toWhatsAppMessage(),
            options: {
              delay: 1200,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to send WhatsApp message: ${response.status} ${errorText}`,
          );
        }

        const result = await response.json();
        log.info("whatsapp_notifier.sent", { recipient });
        return result;
      }, `sendNotification-${recipient}`),
    ).catch((error) => {
      if (error instanceof CircuitBreakerOpenError) {
        log.warn("whatsapp_notifier.circuit_breaker_open", {
          recipient,
          state: circuitBreaker.getState(),
        });
      }
      throw error;
    });
  },

  /**
   * Get configured notification recipients.
   */
  getRecipients(): NotificationRecipient[] {
    return parseRecipients();
  },

  /**
   * Send notification to all configured recipients.
   * Returns array of results and any errors.
   */
  async notifyAll(
    carga: Carga,
  ): Promise<{ success: string[]; errors: { recipient: string; error: string }[] }> {
    const recipients = parseRecipients();
    const success: string[] = [];
    const errors: { recipient: string; error: string }[] = [];

    for (const recipient of recipients) {
      try {
        await this.sendNotification(recipient.phone, carga, recipient.name);
        success.push(recipient.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ recipient: recipient.name, error: message });
        log.warn("whatsapp_notifier.notify_failed", {
          recipient: recipient.name,
          error,
        });
      }
    }

    return { success, errors };
  },

  /**
   * @deprecated Use notifyAll() or configure recipients via NOTIFICATION_RECIPIENTS.
   * Kept for backward compatibility.
   */
  async notifyJean(carga: Carga) {
    const phone = getEnvVar("NOTIFY_JEAN_PHONE");
    if (!phone) {
      throw new Error("Jean phone number not configured");
    }
    return this.sendNotification(phone, carga, "jean");
  },

  /**
   * @deprecated Use notifyAll() or configure recipients via NOTIFICATION_RECIPIENTS.
   * Kept for backward compatibility.
   */
  async notifyJefferson(carga: Carga) {
    const phone = getEnvVar("NOTIFY_JEFFERSON_PHONE");
    if (!phone) {
      throw new Error("Jefferson phone number not configured");
    }
    return this.sendNotification(phone, carga, "jefferson");
  },

  /**
   * Send notification to Sebastiao.
   * Requires NOTIFY_SEBASTIAO_PHONE environment variable.
   */
  async notifySebastiao(carga: Carga) {
    const phone = getEnvVar("NOTIFY_SEBASTIAO_PHONE");
    if (!phone) {
      throw new Error("Sebastiao phone number not configured");
    }
    return this.sendNotification(phone, carga, "sebastiao");
  },

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics() {
    return circuitBreaker.getMetrics();
  },
};
