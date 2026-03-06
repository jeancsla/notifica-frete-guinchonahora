import { useEffect } from "react";
import useSWR from "swr";
import type { StatusResponse } from "@notifica/shared/types";
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

// shadcn/ui components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  } = useSWR<StatusResponse>("status", fetchStatus);

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
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
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
      {error ? (
        <Card className="p-6 text-destructive">Erro: {error.message}</Card>
      ) : null}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Atualização</CardTitle>
                <CardDescription>Última verificação do status.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {formatDateTimeBR(status?.updated_at)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Banco de dados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Versão
                    </span>
                    <span className="font-semibold">
                      {status?.dependencies?.database?.version || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Máx. conexões
                    </span>
                    <span className="font-semibold">
                      {status?.dependencies?.database?.max_connections ?? "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Conexões abertas
                    </span>
                    <span className="font-semibold">
                      {status?.dependencies?.database?.opened_connections ??
                        "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>
      <section
        className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 ${
          isValidating && !isLoading ? "opacity-75 transition-opacity" : ""
        }`}
      >
        <Card>
          <CardHeader>
            <CardTitle>Integração</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              API online e operando.
            </CardDescription>
            <Badge variant="default" className="flex items-center gap-2 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
              </span>
              Operacional
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fila de notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Pendências avaliadas via dashboard.
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Eventos recentes estão sendo registrados.
            </CardDescription>
            {isValidating ? (
              <SkeletonBlock height={12} width="60%" className="mt-4" />
            ) : null}
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
