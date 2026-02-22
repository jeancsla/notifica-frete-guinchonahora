import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import type { CargaRecord } from "@notifica/shared/types";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import {
  InlineRefreshStatus,
  LoadingButton,
  SkeletonBlock,
} from "../components/LoadingUI";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { fetchCargas } from "../lib/api";
import { formatDateBR } from "../lib/date-format";

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
          <h3>Cargas recentes</h3>
          <div className="detail-list">
            {isLoading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <SkeletonBlock
                    key={`btn-skeleton-${idx}`}
                    height={34}
                    width="100%"
                  />
                ))
              : data.map((item) => (
                  <button
                    key={item.id_viagem}
                    className={`button secondary${item.id_viagem === effectiveSelectedId ? " active" : ""}`}
                    style={{ justifyContent: "space-between" }}
                    onClick={() => setSelectedId(item.id_viagem)}
                    aria-pressed={item.id_viagem === effectiveSelectedId}
                  >
                    <span>{item.id_viagem}</span>
                    <span>{item.destino || "N/A"}</span>
                  </button>
                ))}
          </div>
        </div>
        <div className="card">
          <h3>Informações da carga</h3>
          {isLoading ? (
            <div className="detail-list">
              <SkeletonBlock height={14} width="100%" />
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
                <span>Tipo de transporte</span>
                <strong>{selected.tipo_transporte || "N/A"}</strong>
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
                <span>Entregas</span>
                <strong>{selected.qtd_entregas || "N/A"}</strong>
              </div>
              <div className="detail-item">
                <span>Frete</span>
                <strong>{selected.vr_frete || "N/A"}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Selecione uma carga para ver detalhes.</p>
          )}
        </div>
      </section>
    </Layout>
  );
}
