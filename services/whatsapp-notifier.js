import retry from "async-retry";

function isTest() {
  return process.env.NODE_ENV === "test";
}

function getEnvVar(name) {
  return process.env[name];
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
        `[WhatsAppNotifier] Retry ${attempt} for ${operationName}: ${error.message}`,
      );
    },
  });
}

const whatsappNotifier = {
  async sendNotification(phone, carga) {
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

      console.log(`[WhatsAppNotifier] Message sent to ${phone}`);
      return response.json();
    }, `sendNotification-${phone}`);
  },

  formatMessage(carga) {
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

  async notifyJean(carga) {
    const jeanPhone = getEnvVar("NOTIFY_JEAN_PHONE");
    if (!jeanPhone) {
      throw new Error("Jean phone number not configured");
    }
    console.log("[WhatsAppNotifier] Notifying Jean...");
    return this.sendNotification(jeanPhone, carga);
  },

  async notifyJefferson(carga) {
    const jeffersonPhone = getEnvVar("NOTIFY_JEFFERSON_PHONE");
    if (!jeffersonPhone) {
      throw new Error("Jefferson phone number not configured");
    }
    console.log("[WhatsAppNotifier] Notifying Jefferson...");
    return this.sendNotification(jeffersonPhone, carga);
  },

  async notifySebastiao(carga) {
    const sebastiaoPhone = getEnvVar("NOTIFY_SEBASTIAO_PHONE");
    if (!sebastiaoPhone) {
      throw new Error("Sebastiao phone number not configured");
    }
    console.log("[WhatsAppNotifier] Notifying Sebastiao...");
    return this.sendNotification(sebastiaoPhone, carga);
  },
};

export default whatsappNotifier;
