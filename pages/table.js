import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchCargas } from "../lib/api";

export default function TableView() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ limit: 15, offset: 0, total: 0 });
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
      const response = await fetchCargas({
        limit: pagination.limit,
        offset: pagination.offset,
      });
      setData(response.cargas || []);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total ?? prev.total,
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  useEffect(() => {
    wrapRefresh(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.offset, pagination.limit]);

  return (
    <Layout
      title="Table View"
      subtitle="Lista completa de cargas com paginacao."
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
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Viagem</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Produto</th>
              <th>Equipamento</th>
              <th>Coleta</th>
              <th>Entregas</th>
              <th>Frete</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id_viagem}>
                <td>{item.id_viagem}</td>
                <td>{item.tipo_transporte || "N/A"}</td>
                <td>{item.origem || "N/A"}</td>
                <td>{item.destino || "N/A"}</td>
                <td>{item.produto || "N/A"}</td>
                <td>{item.equipamento || "N/A"}</td>
                <td>{item.prev_coleta || "-"}</td>
                <td>{item.qtd_entregas || "-"}</td>
                <td>{item.vr_frete || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
            disabled={pagination.offset + pagination.limit >= pagination.total}
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
    </Layout>
  );
}
