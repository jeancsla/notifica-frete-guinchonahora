import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchCargas, fetchStatus } from "../lib/api";
import { buildActivityEvents, countActivityAlerts } from "../lib/activity";

export default function Activity() {
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState(0);
  const {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
  } = useRefreshFeedback();

  const load = async () => {
    const [cargasResponse, statusResponse] = await Promise.all([
      fetchCargas({ limit: 10, offset: 0 }),
      fetchStatus(),
    ]);

    const cargas = cargasResponse.cargas || [];
    setEvents(buildActivityEvents(cargas, statusResponse));
    setAlerts(countActivityAlerts(cargas));
  };

  useEffect(() => {
    wrapRefresh(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout
      title="Activity"
      subtitle="Linha do tempo das operacoes e eventos recentes."
      actions={
        <>
          <button
            className="button secondary"
            onClick={() => wrapRefresh(load)}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <div
            className={`refresh-status${refreshError ? " error" : ""}`}
            role="status"
          >
            {refreshError
              ? `Erro: ${refreshError}`
              : lastUpdatedAt
                ? "Atualizado agora"
                : ""}
          </div>
        </>
      }
    >
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
      <section className="grid cols-2">
        <div className="card">
          <h3>Timeline</h3>
          <div className="detail-list">
            {events.map((event) => (
              <div key={event.title} className="detail-item">
                <div>
                  <strong>{event.title}</strong>
                  <div className="muted">{event.description}</div>
                </div>
                <span className="badge">{event.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Resumo operacional</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span>Eventos hoje</span>
              <strong>{events.length}</strong>
            </div>
            <div className="detail-item">
              <span>Alertas ativos</span>
              <strong>{alerts}</strong>
            </div>
            <div className="detail-item">
              <span>Operadores online</span>
              <strong>5</strong>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
