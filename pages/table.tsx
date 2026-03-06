import { useEffect, useState } from "react";
import useSWR from "swr";
import type { CargaRecord } from "@notifica/shared/types";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import {
  InlineRefreshStatus,
  LoadingButton,
  TableSkeleton,
} from "../components/LoadingUI";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchCargas } from "../lib/api";
import { formatDateBR } from "../lib/date-format";

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

type TableState = {
  limit: number;
  offset: number;
};

export default function TableView() {
  const [pagination, setPagination] = useState<TableState>({
    limit: 15,
    offset: 0,
  });
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
  } = useSWR(
    ["table-cargas", pagination.limit, pagination.offset],
    ([, limit, offset]) =>
      fetchCargas({
        limit: (limit as number) + 1,
        offset: offset as number,
        includeTotal: false,
      }),
  );

  useEffect(() => {
    if (response) {
      markUpdated();
    }
  }, [response, markUpdated]);

  const rawData = (response?.cargas || []) as CargaRecord[];
  const hasNextPage = rawData.length > pagination.limit;
  const data = rawData.slice(0, pagination.limit);

  async function handleRefresh() {
    await wrapRefresh(() =>
      mutate(undefined, { revalidate: true, throwOnError: true }),
    );
  }

  return (
    <Layout
      title="Tabela"
      subtitle="Lista completa de cargas com paginação."
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
      <Card
        className={
          isValidating && !isLoading ? "opacity-75 transition-opacity" : ""
        }
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">
            Lista de Cargas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <TableSkeleton rows={8} columns={9} />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Viagem</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead className="max-w-[200px]">Produto</TableHead>
                      <TableHead className="max-w-[150px]">
                        Equipamento
                      </TableHead>
                      <TableHead className="w-28">Coleta</TableHead>
                      <TableHead className="w-20 text-center">
                        Entregas
                      </TableHead>
                      <TableHead className="w-24 text-right">Frete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item) => (
                      <TableRow key={item.id_viagem}>
                        <TableCell className="font-medium font-mono">
                          {item.id_viagem}
                        </TableCell>
                        <TableCell>{item.tipo_transporte || "N/A"}</TableCell>
                        <TableCell>{item.origem || "N/A"}</TableCell>
                        <TableCell>{item.destino || "N/A"}</TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={item.produto || "N/A"}
                        >
                          {item.produto || "N/A"}
                        </TableCell>
                        <TableCell
                          className="max-w-[150px] truncate"
                          title={item.equipamento || "N/A"}
                        >
                          {item.equipamento || "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateBR(item.prev_coleta)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.qtd_entregas || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.vr_frete || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Nenhuma carga encontrada.
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
                  disabled={!hasNextPage}
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
    </Layout>
  );
}
