import { formatDateTimeBR, parseDateValue } from "./date-format";

export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

function toTimestamp(value) {
  const date = parseDateValue(value);
  return date ? date.getTime() : null;
}

function getDayKey(value, timeZone = BUSINESS_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function buildActivityEvents(cargas = [], status) {
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
  const statusEvent = status
    ? [
        {
          id: `status-${statusTimestamp || "sem-data"}`,
          title: "Status checado",
          description: "Banco de dados online e estável.",
          time: statusTimestamp ? formatDateTimeBR(status.updated_at) : "Sem data",
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

export function countActivityAlerts(cargas = []) {
  return cargas.filter((carga) => !carga.prev_coleta || !carga.destino).length;
}

export function countTodayEvents(
  events = [],
  now = new Date(),
  timeZone = BUSINESS_TIME_ZONE,
) {
  const todayKey = getDayKey(now, timeZone);

  return events.filter((event) => {
    if (typeof event.timestamp !== "number") return false;
    return getDayKey(event.timestamp, timeZone) === todayKey;
  }).length;
}
