import type {
  CargasResponse,
  DashboardData,
  StatusResponse,
} from "@notifica/shared/types";

type SortOrder = "ASC" | "DESC";

type FetchCargasOptions = {
  limit?: number;
  offset?: number;
  notified?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
  includeTotal?: boolean;
};

async function readErrorMessage(response: Response, fallback: string) {
  const error = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return error.error || error.message || fallback;
}

export async function fetchCargas({
  limit = 10,
  offset = 0,
  notified,
  sortBy,
  sortOrder,
  includeTotal = true,
}: FetchCargasOptions = {}): Promise<CargasResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    includeTotal: String(Boolean(includeTotal)),
  });
  if (typeof notified === "boolean") {
    params.set("notified", String(notified));
  }
  if (sortBy) {
    params.set("sortBy", sortBy);
  }
  if (sortOrder) {
    params.set("sortOrder", sortOrder);
  }

  const response = await fetch(`/api/v1/cargas?${params.toString()}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load cargas"));
  }
  return response.json() as Promise<CargasResponse>;
}

export async function fetchDashboardData({
  limit,
  offset,
}: Pick<FetchCargasOptions, "limit" | "offset">): Promise<DashboardData> {
  const pendingResponse = await fetchCargas({
    limit,
    offset,
    notified: false,
    sortBy: "prev_coleta",
    sortOrder: "DESC",
  });

  const pendingCount = pendingResponse.pagination?.total ?? 0;

  if (pendingCount > 0) {
    return {
      pendingTotal: pendingCount,
      showingRecentFallback: false,
      cargas: pendingResponse.cargas || [],
      total: pendingCount,
    };
  }

  const fallbackResponse = await fetchCargas({
    limit,
    offset,
    sortBy: "created_at",
    sortOrder: "DESC",
  });

  return {
    pendingTotal: pendingCount,
    showingRecentFallback: true,
    cargas: fallbackResponse.cargas || [],
    total: fallbackResponse.pagination?.total ?? 0,
  };
}

export async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch("/api/v1/status");
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load status"));
  }
  return response.json() as Promise<StatusResponse>;
}
