/**
 * Input validation helpers for cargas endpoints
 */

export function isValidCronEventId(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,128}$/.test(value);
}

export function parseMockedResult(value: string): { processed?: number; new_cargas?: unknown[] } | null {
  try {
    return JSON.parse(value) as { processed?: number; new_cargas?: unknown[] };
  } catch {
    return null;
  }
}

export function getContentLength(request: Request): number {
  const raw = request.headers.get("content-length");
  if (!raw) {
    return 0;
  }

  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface ListCargasParams {
  limit: number;
  offset: number;
  notified: string | null;
  sortBy: string | undefined;
  sortOrder: string | undefined;
  includeTotal: boolean;
  fields: string[] | undefined;
}

export function parseListCargasParams(url: URL): { params: ListCargasParams; error?: { status: number; message: string } } {
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const notified = url.searchParams.get("notified");
  const sortBy = url.searchParams.get("sortBy") || undefined;
  const sortOrder = url.searchParams.get("sortOrder") || undefined;
  const includeTotalParam = url.searchParams.get("includeTotal");
  const fieldsParam = url.searchParams.get("fields");

  const fields = fieldsParam
    ? fieldsParam
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean)
    : undefined;

  const limit = limitParam ? parseInt(limitParam, 10) : 10;
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return {
      params: {} as ListCargasParams,
      error: { status: 400, message: "Invalid limit parameter. Must be between 1 and 100." },
    };
  }

  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
  if (isNaN(offset) || offset < 0) {
    return {
      params: {} as ListCargasParams,
      error: { status: 400, message: "Invalid offset parameter. Must be non-negative." },
    };
  }

  const includeTotal = includeTotalParam !== "false";

  return {
    params: { limit, offset, notified, sortBy, sortOrder, includeTotal, fields },
  };
}
