import retry from "async-retry";
import type Carga from "@notifica/shared/models/Carga";
import { logger } from "../apps/api/src/lib/logger";

const log = logger.child({ component: "legacy_whatsapp_notifier" });

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
      log.warn("legacy_whatsapp_notifier.retry", {
        attempt,
        operation: operationName,
        error,
      });
    },
  });
}

const whatsappNotifier = {
  async sendNotification(
    phone: string,
    carga: Carga,
    recipient: "jean" | "jefferson" | "sebastiao" | "unknown" = "unknown",
  ) {
    const apiBaseUrl = getEnvVar("EVOLUTION_API_BASE_URL");
    if (!apiBaseUrl) {
      throw new Error("EVOLUTION_API_BASE_URL not configured");
    }

    const apiInstance = getEnvVar("EVOLUTION_API_INSTANCE");
    const apiKey = getEnvVar("EVOLUTION_API_KEY");

    return withRetry(async () => {
      const messageText = carga.toWhatsAppMessage
        ? carga.toWhatsAppMessage()
        : this.formatMessage(carga);

      const url = `${apiBaseUrl}/message/sendText/${apiInstance}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: phone,
          text: messageText,
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

      log.info("legacy_whatsapp_notifier.sent", { recipient });
      return response.json();
    }, `sendNotification-${recipient}`);
  },

  formatMessage(carga: Partial<Carga>) {
    return [
      "Da uma olhada no site da Mills:",
      `De: ${carga.origem || "N/A"}`,
      `Para: ${carga.destino || "N/A"}`,
      `Produto: ${carga.produto || "N/A"}`,
      `Veiculo: ${carga.equipamento || "N/A"}`,
      `Previsao de Coleta: ${carga.prevColeta || "N/A"}`,
      "https://gestaotegmatransporte.ventunolog.com.br/Login",
    ].join("\n");
  },

  async notifyJean(carga: Carga) {
    const jeanPhone = getEnvVar("NOTIFY_JEAN_PHONE");
    if (!jeanPhone) {
      throw new Error("Jean phone number not configured");
    }
    return this.sendNotification(jeanPhone, carga, "jean");
  },

  async notifyJefferson(carga: Carga) {
    const jeffersonPhone = getEnvVar("NOTIFY_JEFFERSON_PHONE");
    if (!jeffersonPhone) {
      throw new Error("Jefferson phone number not configured");
    }
    return this.sendNotification(jeffersonPhone, carga, "jefferson");
  },

  async notifySebastiao(carga: Carga) {
    const sebastiaoPhone = getEnvVar("NOTIFY_SEBASTIAO_PHONE");
    if (!sebastiaoPhone) {
      throw new Error("Sebastiao phone number not configured");
    }
    return this.sendNotification(sebastiaoPhone, carga, "sebastiao");
  },
};

export default whatsappNotifier;
