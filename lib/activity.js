export function buildActivityEvents(cargas = [], status) {
  const ordered = [...cargas].sort((a, b) => {
    const left = new Date(a.created_at || a.prev_coleta || 0).getTime();
    const right = new Date(b.created_at || b.prev_coleta || 0).getTime();
    return right - left;
  });

  const cargoEvents = ordered.map((carga) => ({
    title: "Carga capturada",
    description: `Viagem ${carga.id_viagem} importada do portal Mills.`,
    time: carga.created_at || carga.prev_coleta || "Agora",
  }));

  const statusEvent = status
    ? [
        {
          title: "Status checado",
          description: "Banco de dados online e estavel.",
          time: status.updated_at || "Agora",
        },
      ]
    : [];

  return [...cargoEvents, ...statusEvent];
}

export function countActivityAlerts(cargas = []) {
  return cargas.filter((carga) => !carga.prev_coleta || !carga.destino).length;
}
