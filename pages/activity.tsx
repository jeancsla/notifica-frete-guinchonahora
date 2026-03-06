import { useEffect, useMemo } from "react";
import useSWR from "swr";
import type { CargaRecord, StatusResponse } from "@notifica/shared/types";
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

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ActivityData = {
  cargas: CargaRecord[];
  status: StatusResponse;
};

async function fetchActivityData(): Promise<ActivityData> {
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

  const { data, error, isLoading, isValidating, mutate } = useSWR<ActivityData>(
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
      title="Atividade"
      subtitle="Linha do tempo das operações e eventos recentes."
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
      <section
        className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${
          isValidating && !isLoading ? "opacity-75 transition-opacity" : ""
        }`}
      >
        <Card>
          <CardHeader>
            <CardTitle>Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <SkeletonBlock
                      key={`activity-skeleton-${idx}`}
                      height={36}
                      width="100%"
                    />
                  ))
                : events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {event.time}
                      </Badge>
                    </div>
                  ))}
              {events.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum evento encontrado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resumo operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Eventos hoje
                </span>
                <span className="font-semibold">
                  {isLoading ? "-" : eventsToday}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Alertas ativos
                </span>
                <span className="font-semibold">
                  {isLoading ? "-" : alerts}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Operadores online
                </span>
                <span className="font-semibold">5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
