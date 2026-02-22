import { formatDateTimeBR, parseDateValue } from "./date-format";

function toTimestamp(value) {
  const date = parseDateValue(value);
  return date ? date.getTime() : null;
}

export function buildActivityEvents(cargas = [], status) {
  const ordered = [...cargas].sort((a, b) => {
    const left = toTimestamp(a.created_at || a.prev_coleta) ?? 0;
    const right = toTimestamp(b.created_at || b.prev_coleta) ?? 0;
    return right - left;
  });

  const cargoEvents = ordered.map((carga) => ({
    title: "Carga capturada",
    description: `Viagem ${carga.id_viagem} importada do portal Mills.`,
    time: formatDateTimeBR(carga.created_at || carga.prev_coleta),
    timestamp: toTimestamp(carga.created_at || carga.prev_coleta) ?? Date.now(),
  }));

  const statusEvent = status
    ? [
        {
          title: "Status checado",
          description: "Banco de dados online e estável.",
          time: formatDateTimeBR(status.updated_at),
          timestamp: toTimestamp(status.updated_at) ?? Date.now(),
        },
      ]
    : [];

  return [...cargoEvents, ...statusEvent].sort(
    (left, right) => right.timestamp - left.timestamp,
  );
}

export function countActivityAlerts(cargas = []) {
  return cargas.filter((carga) => !carga.prev_coleta || !carga.destino).length;
}

export function countTodayEvents(events = [], now = new Date()) {
  return events.filter((event) => {
    const eventDate = new Date(event.timestamp);
    return (
      eventDate.getFullYear() === now.getFullYear() &&
      eventDate.getMonth() === now.getMonth() &&
      eventDate.getDate() === now.getDate()
    );
  }).length;
}
