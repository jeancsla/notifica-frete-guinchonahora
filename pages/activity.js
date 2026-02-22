import { useEffect, useMemo } from "react";
import useSWR from "swr";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import {
  InlineRefreshStatus,
  LoadingButton,
  SkeletonBlock,
} from "../components/LoadingUI";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchCargas, fetchStatus } from "../lib/api";
import {
  buildActivityEvents,
  countActivityAlerts,
  countTodayEvents,
} from "../lib/activity";

async function fetchActivityData() {
  const [cargasResponse, statusResponse] = await Promise.all([
    fetchCargas({ limit: 10, offset: 0, includeTotal: false }),
    fetchStatus(),
  ]);

  return {
    cargas: cargasResponse.cargas || [],
    status: statusResponse,
  };
}

export default function Activity() {
  const {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
    markUpdated,
  } = useRefreshFeedback();

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "activity-data",
    fetchActivityData,
  );

  useEffect(() => {
    if (data) {
      markUpdated();
    }
  }, [data, markUpdated]);

  const events = useMemo(
    () => buildActivityEvents(data?.cargas || [], data?.status || null),
    [data],
  );
  const alerts = useMemo(() => countActivityAlerts(data?.cargas || []), [data]);
  const eventsToday = useMemo(() => countTodayEvents(events), [events]);

  async function handleRefresh() {
    await wrapRefresh(() =>
      mutate(undefined, { revalidate: true, throwOnError: true }),
    );
  }

  return (
    <Layout
      title="Activity"
      subtitle="Linha do tempo das operações e eventos recentes."
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
      <section
        className={`grid cols-2${isValidating && !isLoading ? " soft-loading" : ""}`}
      >
        <div className="card">
          <h3>Timeline</h3>
          <div className="detail-list">
            {isLoading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <SkeletonBlock
                    key={`activity-skeleton-${idx}`}
                    height={36}
                    width="100%"
                  />
                ))
              : events.map((event) => (
                  <div key={event.id} className="detail-item">
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
              <strong>{isLoading ? "-" : eventsToday}</strong>
            </div>
            <div className="detail-item">
              <span>Alertas ativos</span>
              <strong>{isLoading ? "-" : alerts}</strong>
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
