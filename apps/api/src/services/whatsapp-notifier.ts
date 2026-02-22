import retry from "async-retry";
import type { Carga } from "@notifica/shared/models/Carga";

function isTest() {
  return process.env.NODE_ENV === "test";
}

function getEnvVar(name: string) {
  return process.env[name] || "";
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
        `[WhatsAppNotifier] Retry ${attempt} for ${operationName}: ${error.message}`,
      );
    },
  });
}

export const whatsappNotifier = {
  async sendNotification(phone: string, carga: Carga) {
    const apiBaseUrl = getEnvVar("EVOLUTION_API_BASE_URL");
    if (!apiBaseUrl) {
      throw new Error("EVOLUTION_API_BASE_URL not configured");
    }

    const apiInstance = getEnvVar("EVOLUTION_API_INSTANCE");
    const apiKey = getEnvVar("EVOLUTION_API_KEY");

    return withRetry(async () => {
      const url = `${apiBaseUrl}/message/sendText/${apiInstance}`;

      const response = await fetch(url, {
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

      return response.json();
    }, `sendNotification-${phone}`);
  },

  async notifyJean(carga: Carga) {
    const phone = getEnvVar("NOTIFY_JEAN_PHONE");
    if (!phone) {
      throw new Error("Jean phone number not configured");
    }
    return this.sendNotification(phone, carga);
  },

  async notifyJefferson(carga: Carga) {
    const phone = getEnvVar("NOTIFY_JEFFERSON_PHONE");
    if (!phone) {
      throw new Error("Jefferson phone number not configured");
    }
    return this.sendNotification(phone, carga);
  },
};
