import Layout from "../components/Layout";
import { InlineRefreshStatus, LoadingButton } from "../components/LoadingUI";
import Toast from "../components/Toast";
import useRefreshFeedback from "../components/useRefreshFeedback";

export default function Settings() {
  const { isRefreshing, lastUpdatedAt, refreshError, toast, wrapRefresh } =
    useRefreshFeedback();

  return (
    <Layout
      title="Settings"
      subtitle="Configurações de operação, notificações e alertas."
      actions={
        <>
          <LoadingButton
            className="button secondary"
            onClick={() =>
              wrapRefresh(
                () =>
                  new Promise((resolve) => {
                    setTimeout(resolve, 320);
                  }),
              )
            }
            loading={isRefreshing}
            loadingLabel="Atualizando..."
          >
            Atualizar
          </LoadingButton>
          <InlineRefreshStatus
            isLoading={false}
            isValidating={isRefreshing}
            error={refreshError}
            lastUpdatedAt={lastUpdatedAt}
          />
        </>
      }
    >
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
      <section
        className={`grid cols-2${isRefreshing ? " soft-loading" : ""}`}
        aria-busy={isRefreshing ? "true" : "false"}
      >
        <div className="card">
          <h3>Notificações</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span>Canal primário</span>
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
            Ajustes são controlados pelo backend. Esta tela mostra o estado
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
