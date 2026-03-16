import { query } from "../../infra/database";
import { attachRequestIdHeader, createRequestLogger } from "../../lib/logger";
import { hasSessionOrAdminAccess } from "./guards";

export async function cargasHealthHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers?: Record<string, string | number> };
}) {
  const log = createRequestLogger(request).child({ handler: "cargas.health" });
  attachRequestIdHeader(set.headers, request);

  if (request.method !== "GET") {
    set.status = 405;
    log.warn("cargas.health.method_not_allowed", { method: request.method });
    return { error: "Method not allowed" };
  }

  if (!hasSessionOrAdminAccess(request)) {
    set.status = 401;
    log.warn("cargas.health.unauthorized");
    return { error: "Unauthorized", message: "Invalid or missing credentials" };
  }

  try {
    const result = await query({
      text: `
        SELECT id_viagem, origem, destino, created_at, notificado_em
        FROM notifica_frete_cargas
        ORDER BY created_at DESC
        LIMIT 5
      `,
    });

    const countResult = await query({
      text: `
        SELECT COUNT(*) as count
        FROM notifica_frete_cargas
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `,
    });

    const lastCarga = result.rows[0];
    const minutesSinceLastCarga = lastCarga
      ? Math.floor(
          (Date.now() - new Date(lastCarga.created_at as string).getTime()) /
            60000,
        )
      : null;

    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 7 && hour <= 18;
    const shouldHaveRecentCargas =
      isBusinessHours && Number(minutesSinceLastCarga) > 30;
    log.info("cargas.health.loaded", {
      minutes_since_last_carga: minutesSinceLastCarga,
      is_business_hours: isBusinessHours,
      status: shouldHaveRecentCargas ? "warning" : "healthy",
    });

    return {
      status: shouldHaveRecentCargas ? "warning" : "healthy",
      message: shouldHaveRecentCargas
        ? "No cargas processed in last 30 minutes"
        : "Cron jobs appear to be running",
      stats: {
        last_24h_count: parseInt(String(countResult.rows[0]?.count || 0), 10),
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
    };
  } catch (error) {
    log.error("cargas.health.failed", { error });
    set.status = 500;
    return {
      status: "error",
      error: "Unexpected error",
    };
  }
}
