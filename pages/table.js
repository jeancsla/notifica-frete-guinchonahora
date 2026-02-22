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
        limit: limit + 1,
        offset,
        includeTotal: false,
      }),
  );

  useEffect(() => {
    if (response) {
      markUpdated();
    }
  }, [response, markUpdated]);

  const rawData = response?.cargas || [];
  const hasNextPage = rawData.length > pagination.limit;
  const data = rawData.slice(0, pagination.limit);

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
                    <th className="cell-num">Viagem</th>
                    <th>Tipo</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th className="cell-wrap">Produto</th>
                    <th className="cell-wrap">Equipamento</th>
                    <th className="cell-num">Coleta</th>
                    <th className="cell-num">Entregas</th>
                    <th className="cell-num">Frete</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id_viagem}>
                      <td className="cell-num">{item.id_viagem}</td>
                      <td>{item.tipo_transporte || "N/A"}</td>
                      <td>{item.origem || "N/A"}</td>
                      <td>{item.destino || "N/A"}</td>
                      <td className="cell-wrap" title={item.produto || "N/A"}>
                        {item.produto || "N/A"}
                      </td>
                      <td
                        className="cell-wrap"
                        title={item.equipamento || "N/A"}
                      >
                        {item.equipamento || "N/A"}
                      </td>
                      <td className="cell-num">
                        {formatDateBR(item.prev_coleta)}
                      </td>
                      <td className="cell-num">{item.qtd_entregas || "-"}</td>
                      <td className="cell-num">{item.vr_frete || "-"}</td>
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
                disabled={!hasNextPage}
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
