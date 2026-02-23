/**
 * Metrics controller for Prometheus scraping
 */
import { getMetrics, getMetricsContentType } from "../lib/metrics";

export async function metricsHandler({
  set,
}: {
  set: { status?: number | string; headers?: Record<string, string> };
}) {
  try {
    const metrics = await getMetrics();
    set.headers = {
      "Content-Type": getMetricsContentType(),
    };
    return metrics;
  } catch {
    set.status = 500;
    return {
      error: "Failed to collect metrics",
    };
  }
}
