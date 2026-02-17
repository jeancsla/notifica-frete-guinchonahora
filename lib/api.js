export async function fetchCargas({ limit = 10, offset = 0, notified } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (typeof notified === "boolean") {
    params.set("notified", String(notified));
  }

  const response = await fetch(`/api/v1/cargas?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to load cargas");
  }
  return response.json();
}

export async function fetchStatus() {
  const response = await fetch("/api/v1/status");
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to load status");
  }
  return response.json();
}
