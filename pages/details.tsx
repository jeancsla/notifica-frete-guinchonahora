import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, RefreshCw } from "lucide-react";
import useSWR from "swr";
import type { CargaRecord } from "@notifica/shared/types";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { InlineRefreshStatus } from "../components/LoadingUI";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchCargas } from "../lib/api";
import { formatDateBR } from "../lib/date-format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const EMPTY_ARRAY: CargaRecord[] = [];

export default function Details() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
    markUpdated,
  } = useRefreshFeedback();

  const {
    data: response,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR("details-cargas", () =>
    fetchCargas({ limit: 20, offset: 0, includeTotal: false }),
  );

  useEffect(() => {
    if (response) {
      markUpdated();
    }
  }, [response, markUpdated]);

  const data = response?.cargas || EMPTY_ARRAY;
  const selectedIdFromRoute =
    router.isReady && router.query.id ? String(router.query.id) : null;
  const effectiveSelectedId =
    selectedId || selectedIdFromRoute || data[0]?.id_viagem;

  const selected = useMemo(
    () => data.find((item) => item.id_viagem === effectiveSelectedId),
    [data, effectiveSelectedId],
  );

  async function handleRefresh() {
    await wrapRefresh(() =>
      mutate(undefined, { revalidate: true, throwOnError: true }),
    );
  }

  return (
    <Layout
      title="Detalhes"
      subtitle="Detalhamento profundo de uma carga selecionada."
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </>
            )}
          </Button>
          <InlineRefreshStatus
            isLoading={isLoading}
            isValidating={isValidating || isRefreshing}
            error={refreshError || error?.message}
            lastUpdatedAt={lastUpdatedAt}
          />
        </div>
      }
    >
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
      {error ? (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <div className="flex items-center gap-2 text-destructive">
              <span>Erro: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <section
        className={`grid gap-6 lg:grid-cols-2 ${
          isValidating && !isLoading ? "opacity-70" : ""
        }`}
      >
        <Card>
          <CardHeader>
            <CardTitle>Cargas recentes</CardTitle>
            <CardDescription>
              Selecione uma carga para visualizar os detalhes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, idx) => (
                      <Skeleton
                        key={`btn-skeleton-${idx}`}
                        className="h-10 w-full"
                      />
                    ))
                  : data.map((item) => (
                      <Button
                        key={item.id_viagem}
                        variant={
                          item.id_viagem === effectiveSelectedId
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className="w-full justify-between font-normal"
                        onClick={() => setSelectedId(item.id_viagem)}
                        aria-pressed={item.id_viagem === effectiveSelectedId}
                      >
                        <span>{item.id_viagem}</span>
                        <span className="text-muted-foreground">
                          {item.destino || "N/A"}
                        </span>
                      </Button>
                    ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Informações da carga</CardTitle>
            <CardDescription>
              Detalhes completos da carga selecionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : selected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">Viagem</span>
                  <span className="font-semibold">{selected.id_viagem}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">
                    Tipo de transporte
                  </span>
                  <span className="font-medium">
                    {selected.tipo_transporte || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">Origem</span>
                  <span className="font-medium">
                    {selected.origem || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">Destino</span>
                  <span className="font-medium">
                    {selected.destino || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">Produto</span>
                  <span className="font-medium">
                    {selected.produto || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">
                    Equipamento
                  </span>
                  <span className="font-medium">
                    {selected.equipamento || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">
                    Prev. coleta
                  </span>
                  <span className="font-medium">
                    {formatDateBR(selected.prev_coleta)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">
                    Entregas
                  </span>
                  <span className="font-medium">
                    {selected.qtd_entregas || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frete</span>
                  <span className="font-semibold text-primary">
                    {selected.vr_frete || "N/A"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Selecione uma carga para ver detalhes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
