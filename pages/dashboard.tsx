import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import useSWR from "swr";
import { motion } from "framer-motion";
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

type PriorityLevel = "critical" | "high" | "normal" | "low";

const getPriorityLevel = (
  dateStr: string | null | undefined,
): PriorityLevel => {
  if (!dateStr) return "low";
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffHours <= 0) return "critical";
  if (diffHours <= 6) return "critical";
  if (diffHours <= 24) return "high";
  if (diffHours <= 72) return "normal";
  return "low";
};

const getPriorityLabel = (level: PriorityLevel) => {
  if (level === "critical") return "Critica";
  if (level === "high") return "Alta";
  if (level === "normal") return "Media";
  return "Baixa";
};

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
  const [detailOpen, setDetailOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
    at: Date;
  } | null>(null);
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

  useEffect(() => {
    if (!detailOpen || typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1025px)").matches) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailOpen]);

  async function handleRefresh() {
    const ok = await wrapRefresh(() =>
      mutate(undefined, { revalidate: true, throwOnError: true }),
    );
    setActionFeedback({
      type: ok ? "success" : "error",
      message: ok ? "Dados sincronizados" : "Falha ao sincronizar dados",
      at: new Date(),
    });
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
      setActionFeedback({
        type: "success",
        message: "Migrations aplicadas com sucesso",
        at: new Date(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao executar migrations";
      showToast(message, "error");
      setActionFeedback({
        type: "error",
        message,
        at: new Date(),
      });
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
      subtitle="Fretes pendentes de notificação"
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
          {actionFeedback ? (
            <div
              className={`action-feedback ${actionFeedback.type}`}
              role="status"
              aria-live="polite"
            >
              <span>{actionFeedback.message}</span>
              <small>{formatDateTimeBR(actionFeedback.at.toISOString())}</small>
            </div>
          ) : null}
        </>
      }
    >
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
      {error ? <div className="card">Erro: {error.message}</div> : null}
      <motion.section
        className="grid cols-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
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
              <p className="muted">Fretes aguardando notificação</p>
            </div>
            <div className="card">
              <h3>Status</h3>
              <div className="status-dot">Canal ativo</div>
              <p className="muted">Monitorando API em tempo real</p>
            </div>
          </>
        )}
      </motion.section>
      <motion.section
        style={{ marginTop: "24px" }}
        className={`grid cols-2${isValidating && !isLoading ? " soft-loading" : ""}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}
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
                      <th className="cell-num">Prioridade</th>
                      <th className="cell-num">Previsão</th>
                      <th className="cell-num">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => {
                      const priority = getPriorityLevel(item.prev_coleta);
                      return (
                        <tr
                          key={item.id_viagem}
                          onClick={() => {
                            setSelectedId(item.id_viagem);
                            setDetailOpen(true);
                          }}
                          className={`selectable priority-${priority}`}
                          aria-selected={item.id_viagem === effectiveSelectedId}
                        >
                          <td className="cell-num">{item.id_viagem}</td>
                          <td>{item.origem || "N/A"}</td>
                          <td>{item.destino || "N/A"}</td>
                          <td
                            className="cell-wrap"
                            title={item.produto || "N/A"}
                          >
                            {item.produto || "N/A"}
                          </td>
                          <td className="cell-num">
                            <span className={`priority-pill ${priority}`}>
                              {getPriorityLabel(priority)}
                            </span>
                          </td>
                          <td className="cell-num">
                            {formatDateBR(item.prev_coleta)}
                          </td>
                          <td className="cell-num">
                            {formatDateTimeBR(item.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="table-empty">
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
                  Próxima
                </button>
              </div>
            </>
          )}
        </div>

        <div
          className={`detail-panel-backdrop ${detailOpen ? "open" : ""}`}
          onClick={() => setDetailOpen(false)}
        />
        <motion.div
          className={`card detail-panel ${detailOpen ? "open" : ""}`}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ margin: 0 }}>Detalhe rápido</h3>
            <button
              className="close-mobile-panel"
              onClick={() => setDetailOpen(false)}
              aria-label="Fechar detalhes"
            >
              ✕
            </button>
          </div>
          {isLoading ? (
            <div className="detail-list">
              <SkeletonBlock height={14} width="100%" />
              <SkeletonBlock height={14} width="100%" />
              <SkeletonBlock height={14} width="100%" />
              <SkeletonBlock height={14} width="100%" />
            </div>
          ) : selected ? (
            <div className="detail-list">
              <div className="badge detail-badge">
                Selecionado: {selected.id_viagem}
              </div>
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
        </motion.div>
      </motion.section>
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
      allowMigrations: process.env.ENABLE_DASHBOARD_MIGRATIONS === "true",
    },
  };
};
