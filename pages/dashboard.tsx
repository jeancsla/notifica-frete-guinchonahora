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

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

const getPriorityBadgeVariant = (
  level: PriorityLevel,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (level) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    case "normal":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "default";
  }
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
        <div className="flex flex-wrap items-center gap-3">
          <LoadingButton
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            onClick={handleRefresh}
            loading={isRefreshing}
            loadingLabel="Atualizando..."
          >
            Atualizar
          </LoadingButton>
          {allowMigrations && (
            <LoadingButton
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
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
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md ${
                actionFeedback.type === "success"
                  ? "bg-green-500/10 text-green-700"
                  : "bg-red-500/10 text-red-700"
              }`}
              role="status"
              aria-live="polite"
            >
              <span>{actionFeedback.message}</span>
              <span className="text-xs text-muted-foreground">
                {formatDateTimeBR(actionFeedback.at.toISOString())}
              </span>
            </div>
          ) : null}
        </div>
      }
    >
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
      {error ? (
        <Card className="p-6 text-destructive">Erro: {error.message}</Card>
      ) : null}

      {/* Stats Cards */}
      <motion.section
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pendingTotal}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Fretes aguardando notificação
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <span className="text-sm font-medium">Canal ativo</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Monitorando API em tempo real
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </motion.section>

      {/* Table and Details */}
      <motion.section
        className={`grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-4 mt-6 ${
          isValidating && !isLoading ? "opacity-75 transition-opacity" : ""
        }`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}
      >
        {/* Fretes Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">
              Fretes pendentes
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              Exibindo {showingStart}-{showingEnd} de {total}
            </span>
          </CardHeader>
          <CardContent className="pt-0">
            {showingRecentFallback ? (
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum frete pendente no momento. Exibindo fretes recentes.
              </p>
            ) : null}
            {isLoading ? (
              <TableSkeleton rows={6} columns={6} />
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Viagem</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="w-28 text-center">
                          Prioridade
                        </TableHead>
                        <TableHead className="w-28">Previsão</TableHead>
                        <TableHead className="w-32">Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((item) => {
                        const priority = getPriorityLevel(item.prev_coleta);
                        return (
                          <TableRow
                            key={item.id_viagem}
                            onClick={() => {
                              setSelectedId(item.id_viagem);
                              setDetailOpen(true);
                            }}
                            className={`cursor-pointer ${
                              item.id_viagem === effectiveSelectedId
                                ? "bg-muted"
                                : ""
                            } ${
                              priority === "critical"
                                ? "border-l-4 border-l-destructive"
                                : priority === "high"
                                  ? "border-l-4 border-l-orange-500"
                                  : ""
                            }`}
                            data-state={
                              item.id_viagem === effectiveSelectedId
                                ? "selected"
                                : undefined
                            }
                          >
                            <TableCell className="font-medium">
                              {item.id_viagem}
                            </TableCell>
                            <TableCell>{item.origem || "N/A"}</TableCell>
                            <TableCell>{item.destino || "N/A"}</TableCell>
                            <TableCell
                              className="max-w-xs truncate"
                              title={item.produto || "N/A"}
                            >
                              {item.produto || "N/A"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={getPriorityBadgeVariant(priority)}
                              >
                                {getPriorityLabel(priority)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDateBR(item.prev_coleta)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDateTimeBR(item.created_at)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {data.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-24 text-center text-muted-foreground"
                          >
                            Nenhum frete encontrado.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.offset === 0}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        offset: Math.max(prev.offset - prev.limit, 0),
                      }))
                    }
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.offset + pagination.limit >= total}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        offset: prev.offset + prev.limit,
                      }))
                    }
                  >
                    Próxima
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        {/* Mobile backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${
            detailOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setDetailOpen(false)}
        />

        <motion.div
          className={`fixed lg:relative inset-y-0 right-0 lg:inset-auto w-[380px] lg:w-auto z-50 lg:z-auto transform transition-transform duration-200 ease-out ${
            detailOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Card className="h-full lg:h-auto border-0 lg:border shadow-2xl lg:shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Detalhe rápido
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setDetailOpen(false)}
                aria-label="Fechar detalhes"
              >
                <span className="text-lg">×</span>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <SkeletonBlock height={14} width="100%" />
                  <SkeletonBlock height={14} width="100%" />
                  <SkeletonBlock height={14} width="100%" />
                  <SkeletonBlock height={14} width="100%" />
                </div>
              ) : selected ? (
                <div className="space-y-4">
                  <Badge variant="secondary" className="mb-2">
                    Selecionado: {selected.id_viagem}
                  </Badge>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        Viagem
                      </span>
                      <span className="font-medium">{selected.id_viagem}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        Origem
                      </span>
                      <span className="font-medium text-right">
                        {selected.origem || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        Destino
                      </span>
                      <span className="font-medium text-right">
                        {selected.destino || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        Produto
                      </span>
                      <span className="font-medium text-right">
                        {selected.produto || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        Equipamento
                      </span>
                      <span className="font-medium">
                        {selected.equipamento || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        Prev. coleta
                      </span>
                      <span className="font-medium">
                        {formatDateBR(selected.prev_coleta)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">
                        Frete
                      </span>
                      <span className="font-medium">
                        {selected.vr_frete || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecione um frete para ver detalhes.
                </p>
              )}
            </CardContent>
          </Card>
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
