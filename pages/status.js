import { useEffect } from "react";
import useSWR from "swr";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import {
  InlineRefreshStatus,
  LoadingButton,
  SkeletonBlock,
  StatCardSkeleton,
} from "../components/LoadingUI";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchStatus } from "../lib/api";
import { formatDateTimeBR } from "../lib/date-format";

export default function Status() {
  const {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
    markUpdated,
  } = useRefreshFeedback();

  const {
    data: status,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR("status", fetchStatus, {
    dedupingInterval: 0,
    revalidateOnMount: true,
  });

  useEffect(() => {
    if (status) {
      markUpdated();
    }
  }, [status, markUpdated]);

  async function handleRefresh() {
    await wrapRefresh(async () => {
      const freshStatus = await fetchStatus();
      await mutate(freshStatus, { revalidate: false });
    });
  }

  return (
    <Layout
      title="Status"
      subtitle="Saúde do backend e conexões críticas."
      actions={
        <>
          <LoadingButton
            className="button secondary"
            onClick={handleRefresh}
            loading={isRefreshing}
            loadingLabel="Atualizando..."
          >
            Atualizar
          </LoadingButton>
          <InlineRefreshStatus
            isLoading={isLoading}
            isValidating={isValidating || isRefreshing}
            error={refreshError || error?.message}
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
      {error ? <div className="card">Erro: {error.message}</div> : null}
      <section className="grid cols-2">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="card">
              <h3>Atualização</h3>
              <p style={{ fontSize: "18px", fontWeight: 600 }}>
                {formatDateTimeBR(status?.updated_at)}
              </p>
              <p className="muted">Última verificação do status.</p>
            </div>
            <div className="card">
              <h3>Banco de dados</h3>
              <div className="detail-list">
                <div className="detail-item">
                  <span>Versao</span>
                  <strong>
                    {status?.dependencies?.database?.version || "-"}
                  </strong>
                </div>
                <div className="detail-item">
                  <span>Máx. conexões</span>
                  <strong>
                    {status?.dependencies?.database?.max_connections ?? "-"}
                  </strong>
                </div>
                <div className="detail-item">
                  <span>Conexões abertas</span>
                  <strong>
                    {status?.dependencies?.database?.opened_connections ?? "-"}
                  </strong>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
      <section
        style={{ marginTop: "24px" }}
        className={`grid cols-3${isValidating && !isLoading ? " soft-loading" : ""}`}
      >
        <div className="card">
          <h3>Integração</h3>
          <p className="muted">API online e operando.</p>
          <div className="status-dot">Operacional</div>
        </div>
        <div className="card">
          <h3>Fila de notificações</h3>
          <p className="muted">Pendências avaliadas via dashboard.</p>
        </div>
        <div className="card">
          <h3>Logs</h3>
          <p className="muted">Eventos recentes estão sendo registrados.</p>
          {isValidating ? (
            <SkeletonBlock
              height={12}
              width="60%"
              className="skeleton-gap-sm"
            />
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
