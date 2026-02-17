import Layout from "../components/Layout";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";

export default function Settings() {
  const { isRefreshing, lastUpdatedAt, refreshError, toast, wrapRefresh } =
    useRefreshFeedback();

  return (
    <Layout
      title="Settings"
      subtitle="Configuracoes de operacao, notificacoes e alertas."
      actions={
        <>
          <button
            className="button secondary"
            onClick={() => wrapRefresh(async () => {})}
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
      <section className="grid cols-2">
        <div className="card">
          <h3>Notificacoes</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span>Canal primario</span>
              <strong>WhatsApp</strong>
            </div>
            <div className="detail-item">
              <span>Escalonamento</span>
              <strong>Ativo</strong>
            </div>
            <div className="detail-item">
              <span>Intervalo</span>
              <strong>5 min</strong>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Prioridades</h3>
          <p className="muted">
            Ajustes sao controlados pelo backend. Esta tela mostra o estado
            atual.
          </p>
          <div style={{ marginTop: "12px" }} className="badge">
            Integração via API
          </div>
        </div>
      </section>
    </Layout>
  );
}
