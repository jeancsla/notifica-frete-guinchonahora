import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchCargas } from "../lib/api";
import { formatDateBR } from "../lib/date-format";
import { getSession } from "lib/session";

function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard({ allowMigrations }) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    total: 0,
  });
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
    showToast,
  } = useRefreshFeedback();

  async function load() {
    try {
      setError("");
      const response = await fetchCargas({
        limit: pagination.limit,
        offset: pagination.offset,
        notified: false,
        sortBy: "prev_coleta",
        sortOrder: "DESC",
      });
      setData(response.cargas || []);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total ?? prev.total,
      }));
      if (!selectedId && response.cargas?.length) {
        setSelectedId(response.cargas[0].id_viagem);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  useEffect(() => {
    wrapRefresh(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.offset, pagination.limit]);

  async function handleMigrations() {
    setIsMigrating(true);
    try {
      const response = await fetch("/api/v1/migrations", { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Falha ao executar migrations");
      }
      showToast("Migrations executadas", "success");
    } catch (err) {
      showToast(err.message || "Falha ao executar migrations", "error");
    } finally {
      setIsMigrating(false);
    }
  }

  const selected = useMemo(
    () => data.find((item) => item.id_viagem === selectedId),
    [data, selectedId],
  );

  const showingStart = pagination.total > 0 ? pagination.offset + 1 : 0;
  const showingEnd = Math.min(
    pagination.offset + pagination.limit,
    pagination.total,
  );

  return (
    <Layout
      title="Dashboard"
      subtitle="Fretes pendentes de notificacao"
      actions={
        <>
          <button
            className="button secondary"
            onClick={() => wrapRefresh(load)}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </button>
          {allowMigrations && (
            <button
              className="button secondary"
              onClick={handleMigrations}
              disabled={isMigrating}
              title="Executa migrations do banco"
            >
              {isMigrating ? "Migrando..." : "Rodar migrations"}
            </button>
          )}
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
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
      {error ? <div className="card">Erro: {error}</div> : null}
      <section className="grid cols-2">
        <div className="card">
          <h3>Total pendentes</h3>
          <p style={{ fontSize: "32px", fontWeight: 700 }}>
            {pagination.total}
          </p>
          <p className="muted">Fretes aguardando notificacao</p>
        </div>
        <div className="card">
          <h3>Status</h3>
          <div className="status-dot">Canal ativo</div>
          <p className="muted">Monitorando API em tempo real</p>
        </div>
      </section>
      <section style={{ marginTop: "24px" }} className="grid cols-2">
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ margin: 0 }}>Fretes pendentes</h3>
            <span className="muted">
              Exibindo {showingStart}-{showingEnd} de {pagination.total}
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Viagem</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Produto</th>
                  <th>Previsao</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr
                    key={item.id_viagem}
                    onClick={() => setSelectedId(item.id_viagem)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{item.id_viagem}</td>
                    <td>{item.origem || "N/A"}</td>
                    <td>{item.destino || "N/A"}</td>
                    <td>{item.produto || "N/A"}</td>
                    <td>{formatDateBR(item.prev_coleta)}</td>
                    <td>{formatDateTime(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
            <button
              className="button secondary"
              disabled={pagination.offset === 0}
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  offset: Math.max(prev.offset - prev.limit, 0),
                }))
              }
            >
              Anterior
            </button>
            <button
              className="button secondary"
              disabled={
                pagination.offset + pagination.limit >= pagination.total
              }
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  offset: prev.offset + prev.limit,
                }))
              }
            >
              Proxima
            </button>
          </div>
        </div>
        <div className="card">
          <h3>Detalhe rapido</h3>
          {selected ? (
            <div className="detail-list">
              <div className="detail-item">
                <span>Viagem</span>
                <strong>{selected.id_viagem}</strong>
              </div>
              <div className="detail-item">
                <span>Origem</span>
                <strong>{selected.origem || "N/A"}</strong>
              </div>
              <div className="detail-item">
                <span>Destino</span>
                <strong>{selected.destino || "N/A"}</strong>
              </div>
              <div className="detail-item">
                <span>Produto</span>
                <strong>{selected.produto || "N/A"}</strong>
              </div>
              <div className="detail-item">
                <span>Equipamento</span>
                <strong>{selected.equipamento || "N/A"}</strong>
              </div>
              <div className="detail-item">
                <span>Prev. coleta</span>
                <strong>{formatDateBR(selected.prev_coleta)}</strong>
              </div>
              <div className="detail-item">
                <span>Frete</span>
                <strong>{selected.vr_frete || "N/A"}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Selecione um frete para ver detalhes.</p>
          )}
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps = async ({ req, res }) => {
  const session = await getSession(req, res);
  const user = session.user || null;

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: { user },
  };
};
