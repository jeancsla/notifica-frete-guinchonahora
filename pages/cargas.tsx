import { useState, useMemo, useCallback } from "react";
import type { GetServerSideProps } from "next";
import useSWR from "swr";
import { motion } from "framer-motion";
import { Search, Download, Package, Filter } from "lucide-react";
import type { CargaRecord } from "@notifica/shared/types";
import Layout from "../components/Layout";
import Toast from "../components/Toast";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { TableSkeleton } from "../components/LoadingUI";
import { formatDateBR } from "../lib/date-format";
import { getSession } from "lib/session";
import type { SessionUser } from "@notifica/shared/types";

// shadcn components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function CargasPage({ user: _user }: CargasPageProps) {
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
  const _total = data?.total || 0;

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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por viagem, origem, destino, produto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {priorities.map((p) => (
                  <Button
                    key={p.value}
                    variant={priorityFilter === p.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriorityFilter(p.value)}
                    aria-pressed={priorityFilter === p.value}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              {/* Export Button */}
              <Button onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
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
        <Card>
          <CardContent className="p-6">
            <TableSkeleton rows={8} columns={6} />
          </CardContent>
        </Card>
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
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cargas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Exibindo {showingStart}-{showingEnd} de{" "}
                  {filteredCargas.length}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Viagem</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Previsão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCargas.map((carga: CargaRecord) => {
                    const priority = getPriorityLevel(carga.prev_coleta);
                    return (
                      <TableRow key={carga.id_viagem}>
                        <TableCell className="font-medium">
                          {carga.id_viagem}
                        </TableCell>
                        <TableCell>{carga.origem || "N/A"}</TableCell>
                        <TableCell>{carga.destino || "N/A"}</TableCell>
                        <TableCell>{carga.produto || "N/A"}</TableCell>
                        <TableCell>{carga.equipamento || "N/A"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              priority === "critical"
                                ? "destructive"
                                : priority === "high"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {getPriorityLabel(priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateBR(carga.prev_coleta)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.offset === 0}
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      offset: Math.max(0, p.offset - p.limit),
                    }))
                  }
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {Math.floor(pagination.offset / pagination.limit) + 1}{" "}
                  de {Math.ceil(filteredCargas.length / pagination.limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    pagination.offset + pagination.limit >=
                    filteredCargas.length
                  }
                  onClick={() =>
                    setPagination((p) => ({ ...p, offset: p.offset + p.limit }))
                  }
                >
                  Próxima
                </Button>
              </div>
            </CardContent>
          </Card>
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
