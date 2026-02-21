export async function fetchCargas({
  limit = 10,
  offset = 0,
  notified,
  sortBy,
  sortOrder,
  includeTotal = true,
} = {}) {
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to load cargas");
  }
  return response.json();
}

export async function fetchDashboardData({ limit, offset }) {
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

export async function fetchStatus() {
  const response = await fetch("/api/v1/status");
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to load status");
  }
  return response.json();
}
