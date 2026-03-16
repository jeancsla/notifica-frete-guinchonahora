/**
 * Input validation helpers for cargas endpoints
 */
import {
  ListCargasQuerySchema,
  CronEventSchema,
  parseQueryParams,
  type ListCargasQueryInput,
} from "../../lib/schemas";

export function isValidCronEventId(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,128}$/.test(value);
}

export function parseMockedResult(
  value: string,
): { processed?: number; new_cargas?: unknown[] } | null {
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

export interface ListCargasParams extends ListCargasQueryInput {}

export function parseListCargasParams(url: URL): {
  params: ListCargasParams;
  error?: { status: number; message: string };
} {
  const result = parseQueryParams(url, ListCargasQuerySchema);

  if (!result.success) {
    return {
      params: {} as ListCargasParams,
      error: {
        status: 400,
        message: result.error,
      },
    };
  }

  // Transform notified string to actual boolean or null
  const notified =
    result.data.notified === null
      ? null
      : result.data.notified === "true"
        ? "true"
        : "false";

  return {
    params: {
      ...result.data,
      notified,
    },
  };
}
