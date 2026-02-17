import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchCargas } from "../lib/api";

export default function Details() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const { isRefreshing, lastUpdatedAt, refreshError, toast, wrapRefresh } =
    useRefreshFeedback();

  async function load() {
    try {
      setError("");
      const response = await fetchCargas({ limit: 20, offset: 0 });
      setData(response.cargas || []);
      if (!selectedId && response.cargas?.length) {
        setSelectedId(response.cargas[0].id_viagem);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.id) {
      setSelectedId(String(router.query.id));
    }
    wrapRefresh(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const selected = useMemo(
    () => data.find((item) => item.id_viagem === selectedId),
    [data, selectedId],
  );

  return (
    <Layout
      title="Details"
      subtitle="Detalhamento profundo de uma carga selecionada."
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
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
      {error ? <div className="card">Erro: {error}</div> : null}
      <section className="grid cols-2">
        <div className="card">
          <h3>Cargas recentes</h3>
          <div className="detail-list">
            {data.map((item) => (
              <button
                key={item.id_viagem}
                className="button secondary"
                style={{ justifyContent: "space-between" }}
                onClick={() => setSelectedId(item.id_viagem)}
              >
                <span>{item.id_viagem}</span>
                <span>{item.destino || "N/A"}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Informacoes da carga</h3>
          {selected ? (
            <div className="detail-list">
              <div className="detail-item">
                <span>Viagem</span>
                <strong>{selected.id_viagem}</strong>
              </div>
              <div className="detail-item">
                <span>Tipo transporte</span>
                <strong>{selected.tipo_transporte || "N/A"}</strong>
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
                <strong>{selected.prev_coleta || "N/A"}</strong>
              </div>
              <div className="detail-item">
                <span>Entregas</span>
                <strong>{selected.qtd_entregas || "N/A"}</strong>
              </div>
              <div className="detail-item">
                <span>Frete</span>
                <strong>{selected.vr_frete || "N/A"}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Selecione uma carga para ver detalhes.</p>
          )}
        </div>
      </section>
    </Layout>
  );
}
