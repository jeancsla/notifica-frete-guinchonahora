import { useEffect, useState } from "react";
import useSWR from "swr";
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

export default function TableView() {
  const [pagination, setPagination] = useState({
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
        limit,
        offset,
      }),
    {
      dedupingInterval: 0,
      revalidateOnMount: true,
    },
  );

  useEffect(() => {
    if (response) {
      markUpdated();
    }
  }, [response, markUpdated]);

  const data = response?.cargas || [];
  const total = response?.pagination?.total ?? 0;

  async function handleRefresh() {
    await wrapRefresh(() =>
      mutate(undefined, { revalidate: true, throwOnError: true }),
    );
  }

  return (
    <Layout
      title="Table View"
      subtitle="Lista completa de cargas com paginação."
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
      <div
        className={`card${isValidating && !isLoading ? " soft-loading" : ""}`}
      >
        {isLoading ? (
          <TableSkeleton rows={8} columns={9} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Viagem</th>
                    <th>Tipo</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Produto</th>
                    <th>Equipamento</th>
                    <th>Coleta</th>
                    <th>Entregas</th>
                    <th>Frete</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id_viagem}>
                      <td>{item.id_viagem}</td>
                      <td>{item.tipo_transporte || "N/A"}</td>
                      <td>{item.origem || "N/A"}</td>
                      <td>{item.destino || "N/A"}</td>
                      <td>{item.produto || "N/A"}</td>
                      <td>{item.equipamento || "N/A"}</td>
                      <td>{formatDateBR(item.prev_coleta)}</td>
                      <td>{item.qtd_entregas || "-"}</td>
                      <td>{item.vr_frete || "-"}</td>
                    </tr>
                  ))}
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="table-empty">
                        Nenhuma carga encontrada.
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
    </Layout>
  );
}
