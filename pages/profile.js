import Layout from "../components/Layout";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";

export default function Profile() {
  const { isRefreshing, lastUpdatedAt, refreshError, toast, wrapRefresh } =
    useRefreshFeedback();

  return (
    <Layout
      title="Profile"
      subtitle="Informacoes operacionais do responsavel pelo turno."
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
          <h3>Operador principal</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span>Nome</span>
              <strong>Equipe Guincho Agora</strong>
            </div>
            <div className="detail-item">
              <span>Turno</span>
              <strong>24/7</strong>
            </div>
            <div className="detail-item">
              <span>Status</span>
              <strong>Online</strong>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Contato interno</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span>Email</span>
              <strong>operacoes@guinchoagora.com</strong>
            </div>
            <div className="detail-item">
              <span>Telefone</span>
              <strong>+55 11 99999-9999</strong>
            </div>
            <div className="detail-item">
              <span>Canal</span>
              <strong>WhatsApp / Slack</strong>
            </div>
          </div>
        </div>
      </section>
      <section style={{ marginTop: "24px" }} className="grid cols-3">
        <div className="card">
          <h3>Escala</h3>
          <p className="muted">Rodizio automatico via API de turnos.</p>
        </div>
        <div className="card">
          <h3>Permissoes</h3>
          <p className="muted">Dashboard leitura total.</p>
        </div>
        <div className="card">
          <h3>Ultima atualizacao</h3>
          <p className="muted">Sincronizado automaticamente.</p>
        </div>
      </section>
    </Layout>
  );
}
