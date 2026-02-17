import database from "infra/database.js";

/**
 * Health check for cron job monitoring
 * Returns last processed cargas to verify cron is working
 */
async function healthHandler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get last 5 processed cargas with their created_at
    const result = await database.query({
      text: `
        SELECT id_viagem, origem, destino, created_at, notificado_em
        FROM cargas
        ORDER BY created_at DESC
        LIMIT 5
      `,
    });

    // Get count of cargas in last 24 hours
    const countResult = await database.query({
      text: `
        SELECT COUNT(*) as count
        FROM cargas
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `,
    });

    const lastCarga = result.rows[0];
    const minutesSinceLastCarga = lastCarga
      ? Math.floor((Date.now() - new Date(lastCarga.created_at)) / 60000)
      : null;

    // Alert if no cargas in last 30 minutes (during business hours)
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 7 && hour <= 18;
    const shouldHaveRecentCargas =
      isBusinessHours && minutesSinceLastCarga > 30;

    return response.status(200).json({
      status: shouldHaveRecentCargas ? "warning" : "healthy",
      message: shouldHaveRecentCargas
        ? "No cargas processed in last 30 minutes"
        : "Cron jobs appear to be running",
      stats: {
        last_24h_count: parseInt(countResult.rows[0].count, 10),
        minutes_since_last_carga: minutesSinceLastCarga,
        last_carga: lastCarga
          ? {
              id_viagem: lastCarga.id_viagem,
              origem: lastCarga.origem,
              destino: lastCarga.destino,
              created_at: lastCarga.created_at,
              notificado_em: lastCarga.notificado_em,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[Health] Error:", error);
    return response.status(500).json({
      status: "error",
      error: error.message,
    });
  }
}

export default healthHandler;
