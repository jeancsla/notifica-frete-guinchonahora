import { useState, useMemo, useCallback } from "react";
import type { GetServerSideProps } from "next";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  Package,
  AlertCircle,
  RefreshCw,
  Filter,
} from "lucide-react";
import type { CargaRecord } from "@notifica/shared/types";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { StatCardSkeleton, TableSkeleton } from "../components/LoadingUI";
import useRefreshFeedback from "../components/useRefreshFeedback";
import { formatDateBR, formatDateTimeBR } from "../lib/date-format";
import { getSession } from "lib/session";
import type { SessionUser } from "@notifica/shared/types";

// Priority utilities
type PriorityLevel = "critical" | "high" | "normal" | "low";

function getPriorityLevel(dateStr: string | null | undefined): PriorityLevel {
  if (!dateStr) return "low";
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffHours <= 6) return "critical";
  if (diffHours <= 24) return "high";
  if (diffHours <= 72) return "normal";
  return "low";
}

function getPriorityLabel(level: PriorityLevel): string {
  const labels: Record<PriorityLevel, string> = {
    critical: "Crítica",
    high: "Alta",
    normal: "Média",
    low: "Baixa",
  };
  return labels[level];
}

function getPriorityColor(level: PriorityLevel): { bg: string; color: string } {
  const colors: Record<PriorityLevel, { bg: string; color: string }> = {
    critical: { bg: "#dc2626", color: "#ffffff" },
    high: { bg: "#ea580c", color: "#ffffff" },
    normal: { bg: "#ca8a04", color: "#ffffff" },
    low: { bg: "#16a34a", color: "#ffffff" },
  };
  return colors[level];
}

type CargasPageProps = {
  user: SessionUser;
};

// Fetcher that tries real API first, falls back to mock
async function fetchCargas() {
  try {
    const res = await fetch(
      "/api/v1/cargas?limit=50&offset=0&includeTotal=true",
    );
    if (res.ok) {
      return res.json();
    }
    throw new Error("API unavailable");
  } catch {
    // Fallback to mock API
    const mockRes = await fetch("/api/mock/cargas");
    if (!mockRes.ok) throw new Error("Failed to fetch cargas");
    return mockRes.json();
  }
}

export default function CargasPage({ user }: CargasPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({ limit: 16, offset: 0 });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({
    message: "",
    type: "success",
    visible: false,
  });

  const { data, error, isLoading, mutate } = useSWR("cargas", fetchCargas, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
  });

  const cargas = data?.cargas || [];
  const total = data?.total || 0;

  // Filter cargas based on search and priority
  const filteredCargas = useMemo(() => {
    return cargas.filter((carga: CargaRecord) => {
      const matchesSearch =
        !searchQuery ||
        carga.id_viagem
          ?.toString()
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        carga.origem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carga.destino?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carga.produto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carga.equipamento?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority =
        priorityFilter === "all" ||
        getPriorityLevel(carga.prev_coleta) === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [cargas, searchQuery, priorityFilter]);

  // Paginated results
  const paginatedCargas = useMemo(() => {
    return filteredCargas.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    );
  }, [filteredCargas, pagination]);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type, visible: true });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    },
    [],
  );

  const handleRefresh = useCallback(async () => {
    try {
      await mutate(undefined, { revalidate: true });
      showToast("Dados atualizados", "success");
    } catch {
      showToast("Erro ao atualizar", "error");
    }
  }, [mutate, showToast]);

  const handleExport = useCallback(() => {
    if (filteredCargas.length === 0) {
      showToast("Nenhum dado para exportar", "error");
      return;
    }

    const headers = [
      "Viagem",
      "Origem",
      "Destino",
      "Produto",
      "Equipamento",
      "Previsão",
      "Frete",
    ];
    const rows = filteredCargas.map((c: CargaRecord) => [
      c.id_viagem,
      c.origem,
      c.destino,
      c.produto,
      c.equipamento,
      formatDateBR(c.prev_coleta),
      c.vr_frete,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cargas_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado", "success");
  }, [filteredCargas, showToast]);

  const priorities = [
    { value: "all", label: "Todas" },
    { value: "critical", label: "Crítica" },
    { value: "high", label: "Alta" },
    { value: "normal", label: "Média" },
    { value: "low", label: "Baixa" },
  ];

  const showingStart = filteredCargas.length > 0 ? pagination.offset + 1 : 0;
  const showingEnd = Math.min(
    pagination.offset + pagination.limit,
    filteredCargas.length,
  );

  return (
    <Layout title="Cargas" subtitle="Lista completa de cargas com filtros">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />

      {/* Search and Filter Bar */}
      <motion.div
        className="card search-bar"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="search-controls">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="input search-input"
              placeholder="Buscar por viagem, origem, destino, produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <Filter size={16} className="filter-icon" />
            {priorities.map((p) => (
              <button
                key={p.value}
                className={`filter-button ${priorityFilter === p.value ? "active" : ""}`}
                onClick={() => setPriorityFilter(p.value)}
                aria-pressed={priorityFilter === p.value}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button className="button export-button" onClick={handleExport}>
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <ErrorState
          title="Erro ao carregar dados"
          message="Não foi possível carregar as cargas. Tente novamente."
          onRetry={handleRefresh}
        />
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="card">
          <TableSkeleton rows={8} columns={6} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredCargas.length === 0 && (
        <EmptyState
          title="Nenhuma carga encontrada"
          description="Tente ajustar os filtros ou buscar por outro termo."
          icon={Package}
          action={{
            label: "Verificar novamente",
            onClick: handleRefresh,
          }}
        />
      )}

      {/* Table */}
      {!isLoading && !error && filteredCargas.length > 0 && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08 }}
        >
          <div className="table-header">
            <h3>Cargas</h3>
            <span className="muted">
              Exibindo {showingStart}-{showingEnd} de {filteredCargas.length}
            </span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Viagem</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Produto</th>
                  <th>Equipamento</th>
                  <th>Prioridade</th>
                  <th>Previsão</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCargas.map((carga: CargaRecord) => {
                  const priority = getPriorityLevel(carga.prev_coleta);
                  const colors = getPriorityColor(priority);
                  return (
                    <tr key={carga.id_viagem}>
                      <td className="cell-num">{carga.id_viagem}</td>
                      <td>{carga.origem || "N/A"}</td>
                      <td>{carga.destino || "N/A"}</td>
                      <td>{carga.produto || "N/A"}</td>
                      <td>{carga.equipamento || "N/A"}</td>
                      <td>
                        <span
                          className="priority-pill"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.color,
                          }}
                        >
                          {getPriorityLabel(priority)}
                        </span>
                      </td>
                      <td className="cell-num">
                        {formatDateBR(carga.prev_coleta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-controls">
            <button
              className="button secondary"
              disabled={pagination.offset === 0}
              onClick={() =>
                setPagination((p) => ({
                  ...p,
                  offset: Math.max(0, p.offset - p.limit),
                }))
              }
            >
              Anterior
            </button>
            <span className="pagination-info">
              Página {Math.floor(pagination.offset / pagination.limit) + 1} de{" "}
              {Math.ceil(filteredCargas.length / pagination.limit)}
            </span>
            <button
              className="button secondary"
              disabled={
                pagination.offset + pagination.limit >= filteredCargas.length
              }
              onClick={() =>
                setPagination((p) => ({ ...p, offset: p.offset + p.limit }))
              }
            >
              Próxima
            </button>
          </div>
        </motion.div>
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<CargasPageProps> = async ({
  req,
}) => {
  const session = await getSession(req as { headers?: { cookie?: string } });
  const user = session.user;

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: { user },
  };
};
