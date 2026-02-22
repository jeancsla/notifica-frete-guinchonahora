import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import useSWR from "swr";
import type {
  CargaRecord,
  DashboardData,
  SessionUser,
} from "@notifica/shared/types";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import {
  InlineRefreshStatus,
  LoadingButton,
  SkeletonBlock,
  StatCardSkeleton,
  TableSkeleton,
} from "../components/LoadingUI";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchDashboardData } from "../lib/api";
import { formatDateBR, formatDateTimeBR } from "../lib/date-format";
import { getSession } from "lib/session";

const EMPTY_ARRAY: CargaRecord[] = [];

type DashboardProps = {
  allowMigrations: boolean;
  user: SessionUser;
};

export default function Dashboard({ allowMigrations }: DashboardProps) {
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
    showToast,
    markUpdated,
  } = useRefreshFeedback();

  const {
    data: dashboard,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DashboardData, Error, [string, number, number]>(
    ["dashboard-cargas", pagination.limit, pagination.offset],
    ([, limit, offset]) => fetchDashboardData({ limit, offset }),
  );

  useEffect(() => {
    if (dashboard) {
      markUpdated();
    }
  }, [dashboard, markUpdated]);

  useEffect(() => {
    if (!selectedId && dashboard?.cargas?.length) {
      setSelectedId(dashboard.cargas[0].id_viagem);
    }
  }, [dashboard, selectedId]);

  async function handleRefresh() {
    await wrapRefresh(() =>
      mutate(undefined, { revalidate: true, throwOnError: true }),
    );
  }

  async function handleMigrations() {
    setIsMigrating(true);
    try {
      const response = await fetch("/api/v1/migrations", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload?.message || "Falha ao executar migrations");
      }
      showToast("Migrations executadas", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao executar migrations";
      showToast(message, "error");
    } finally {
      setIsMigrating(false);
    }
  }

  const data = dashboard?.cargas || EMPTY_ARRAY;
  const pendingTotal = dashboard?.pendingTotal ?? 0;
  const showingRecentFallback = dashboard?.showingRecentFallback;
  const total = dashboard?.total ?? 0;

  const effectiveSelectedId = data.some((item) => item.id_viagem === selectedId)
    ? selectedId
    : data[0]?.id_viagem;
  const selected = useMemo(
    () => data.find((item) => item.id_viagem === effectiveSelectedId),
    [data, effectiveSelectedId],
  );

  const showingStart = total > 0 ? pagination.offset + 1 : 0;
  const showingEnd = Math.min(pagination.offset + pagination.limit, total);

  return (
    <Layout
      title="Dashboard"
      subtitle="Fretes pendentes de notificacao"
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
          {allowMigrations && (
            <LoadingButton
              className="button secondary"
              onClick={handleMigrations}
              loading={isMigrating}
              loadingLabel="Migrando..."
              title="Executa migrations do banco"
            >
              Rodar migrations
            </LoadingButton>
          )}
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
              <h3>Total pendentes</h3>
              <p style={{ fontSize: "32px", fontWeight: 700 }}>
                {pendingTotal}
              </p>
              <p className="muted">Fretes aguardando notificacao</p>
            </div>
            <div className="card">
              <h3>Status</h3>
              <div className="status-dot">Canal ativo</div>
              <p className="muted">Monitorando API em tempo real</p>
            </div>
          </>
        )}
      </section>
      <section
        style={{ marginTop: "24px" }}
        className={`grid cols-2${isValidating && !isLoading ? " soft-loading" : ""}`}
      >
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
              Exibindo {showingStart}-{showingEnd} de {total}
            </span>
          </div>
          {showingRecentFallback ? (
            <p className="muted" style={{ marginBottom: "12px" }}>
              Nenhum frete pendente no momento. Exibindo fretes recentes.
            </p>
          ) : null}
          {isLoading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="cell-num">Viagem</th>
                      <th>Origem</th>
                      <th>Destino</th>
                      <th className="cell-wrap">Produto</th>
                      <th className="cell-num">Previsão</th>
                      <th className="cell-num">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr
                        key={item.id_viagem}
                        onClick={() => setSelectedId(item.id_viagem)}
                        className="selectable"
                        aria-selected={item.id_viagem === effectiveSelectedId}
                      >
                        <td className="cell-num">{item.id_viagem}</td>
                        <td>{item.origem || "N/A"}</td>
                        <td>{item.destino || "N/A"}</td>
                        <td className="cell-wrap" title={item.produto || "N/A"}>
                          {item.produto || "N/A"}
                        </td>
                        <td className="cell-num">
                          {formatDateBR(item.prev_coleta)}
                        </td>
                        <td className="cell-num">
                          {formatDateTimeBR(item.created_at)}
                        </td>
                      </tr>
                    ))}
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="table-empty">
                          Nenhum frete encontrado.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="pagination-controls">
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
                  disabled={pagination.offset + pagination.limit >= total}
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
            </>
          )}
        </div>
        <div className="card">
          <h3>Detalhe rapido</h3>
          {isLoading ? (
            <div className="detail-list">
              <SkeletonBlock height={14} width="100%" />
              <SkeletonBlock height={14} width="100%" />
              <SkeletonBlock height={14} width="100%" />
              <SkeletonBlock height={14} width="100%" />
            </div>
          ) : selected ? (
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

export const getServerSideProps: GetServerSideProps<DashboardProps> = async ({
  req,
}) => {
  const session = await getSession(req as { headers?: { cookie?: string } });
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
    props: {
      user,
      allowMigrations: true,
    },
  };
};
