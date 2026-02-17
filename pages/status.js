import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchStatus } from "../lib/api";

export default function Status() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
  } = useRefreshFeedback();

  async function load() {
    try {
      setError("");
      const response = await fetchStatus();
      setStatus(response);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  useEffect(() => {
    wrapRefresh(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout
      title="Status"
      subtitle="Saude do backend e conexoes criticas."
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
      {error ? <div className="card">Erro: {error}</div> : null}
      <section className="grid cols-2">
        <div className="card">
          <h3>Atualizacao</h3>
          <p style={{ fontSize: "18px", fontWeight: 600 }}>
            {status?.updated_at || "-"}
          </p>
          <p className="muted">Ultima verificacao do status.</p>
        </div>
        <div className="card">
          <h3>Banco de dados</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span>Versao</span>
              <strong>{status?.dependencies?.database?.version || "-"}</strong>
            </div>
            <div className="detail-item">
              <span>Max conexoes</span>
              <strong>
                {status?.dependencies?.database?.max_connections ?? "-"}
              </strong>
            </div>
            <div className="detail-item">
              <span>Conexoes abertas</span>
              <strong>
                {status?.dependencies?.database?.opened_connections ?? "-"}
              </strong>
            </div>
          </div>
        </div>
      </section>
      <section style={{ marginTop: "24px" }} className="grid cols-3">
        <div className="card">
          <h3>Integracao</h3>
          <p className="muted">API online e operando.</p>
          <div className="status-dot">Operacional</div>
        </div>
        <div className="card">
          <h3>Fila de notificacoes</h3>
          <p className="muted">Pendencias avaliadas via dashboard.</p>
        </div>
        <div className="card">
          <h3>Logs</h3>
          <p className="muted">Eventos recentes estao sendo registrados.</p>
        </div>
      </section>
    </Layout>
  );
}
