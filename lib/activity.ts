import type { CargaRecord, StatusResponse } from "@notifica/shared/types";
import { formatDateTimeBR, parseDateValue } from "./date-format";

export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

export type ActivityEvent = {
  id: string;
  title: string;
  description: string;
  time: string;
  timestamp: number | null;
};

function toTimestamp(value: string | null | undefined): number | null {
  const date = parseDateValue(value);
  return date ? date.getTime() : null;
}

function getDayKey(
  value: number | Date,
  timeZone = BUSINESS_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function buildActivityEvents(
  cargas: CargaRecord[] = [],
  status?: StatusResponse | null,
): ActivityEvent[] {
  const ordered = [...cargas].sort((a, b) => {
    const left = toTimestamp(a.created_at || a.prev_coleta) ?? 0;
    const right = toTimestamp(b.created_at || b.prev_coleta) ?? 0;
    return right - left;
  });

  const cargoEvents = ordered.map((carga, index) => {
    const rawDate = carga.created_at || carga.prev_coleta;
    const timestamp = toTimestamp(rawDate);

    return {
      id: `carga-${carga.id_viagem || "sem-id"}-${timestamp || index}`,
      title: "Carga capturada",
      description: `Viagem ${carga.id_viagem} importada do portal Mills.`,
      time: timestamp ? formatDateTimeBR(rawDate) : "Sem data",
      timestamp,
    };
  });

  const statusTimestamp = toTimestamp(status?.updated_at);
  const statusEvent: ActivityEvent[] = status
    ? [
        {
          id: `status-${statusTimestamp || "sem-data"}`,
          title: "Status checado",
          description: "Banco de dados online e estavel.",
          time: statusTimestamp
            ? formatDateTimeBR(status.updated_at)
            : "Sem data",
          timestamp: statusTimestamp,
        },
      ]
    : [];

  return [...cargoEvents, ...statusEvent].sort(
    (left, right) =>
      (right.timestamp ?? Number.NEGATIVE_INFINITY) -
      (left.timestamp ?? Number.NEGATIVE_INFINITY),
  );
}

export function countActivityAlerts(cargas: CargaRecord[] = []): number {
  return cargas.filter((carga) => !carga.prev_coleta || !carga.destino).length;
}

export function countTodayEvents(
  events: Array<{ timestamp: number | null }> = [],
  now = new Date(),
  timeZone = BUSINESS_TIME_ZONE,
): number {
  const todayKey = getDayKey(now, timeZone);

  return events.filter((event) => {
    if (typeof event.timestamp !== "number") return false;
    return getDayKey(event.timestamp, timeZone) === todayKey;
  }).length;
}
