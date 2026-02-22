import { query } from "../infra/database";
import { buildWeakEtag, isEtagMatch, setCacheControl } from "../lib/http-cache";
import { getSessionUser } from "../lib/session";
import {
  buildCacheKey,
  getServerCache,
  invalidateServerCacheByTag,
  setServerCache,
} from "../lib/server-cache";
import { timingSafeEqualString } from "../lib/security";
import { cargasRepository } from "../repositories/cargas-repository";
import { cargoProcessor } from "../services/cargo-processor";

function getElapsedMs(start: number) {
  return Math.round(performance.now() - start);
}

function isTestMode() {
  return process.env.TEST_MODE === "1";
}

function isVercelCron(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";
  return userAgent.includes("vercel-cron");
}

function hasAdminApiKey(request: Request) {
  const apiKey = request.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_API_KEY || "";
  if (!apiKey || !expected) {
    return false;
  }

  return timingSafeEqualString(apiKey, expected);
}

export async function cargasIndexHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) {
  if (!getSessionUser(request)) {
    set.status = 401;
    return { error: "Unauthorized" };
  }

  if (request.method !== "GET") {
    set.status = 405;
    return { error: "Method not allowed" };
  }

  const start = performance.now();
  let dbElapsedMs = 0;

  try {
    const url = new URL(request.url);
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
      set.status = 400;
      return { error: "Invalid limit parameter. Must be between 1 and 100." };
    }

    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    if (isNaN(offset) || offset < 0) {
      set.status = 400;
      return { error: "Invalid offset parameter. Must be non-negative." };
    }

    const includeTotal = includeTotalParam !== "false";
    const cacheTtlSeconds = parseInt(
      process.env.API_CACHE_TTL_CARGAS || "20",
      10,
    );
    const cacheKey = buildCacheKey("cargas:v1", {
      limit,
      offset,
      notified,
      sortBy,
      sortOrder,
      includeTotal,
      fields: fields?.join(","),
    });

    const useServerCache = !isTestMode();

    const cachedPayload = useServerCache
      ? getServerCache<{
          cargas: unknown[];
          pagination: unknown;
        }>(cacheKey)
      : null;

    if (cachedPayload) {
      const etag = buildWeakEtag(cachedPayload);
      setCacheControl(set.headers, {
        visibility: "private",
        maxAge: 0,
        sMaxAge: cacheTtlSeconds,
        staleWhileRevalidate: cacheTtlSeconds * 3,
      });

      set.headers.ETag = etag;
      set.headers.Vary = "Cookie";
      set.headers["X-Cache"] = "HIT";
      set.headers["X-Response-Time"] = `${getElapsedMs(start)}ms`;

      if (isEtagMatch(request, etag)) {
        set.status = 304;
        return "";
      }

      return cachedPayload;
    }

    let cargas;
    let total: number | null = null;

    const sortOptions = { sortBy, sortOrder };
    const dbStart = performance.now();

    if (notified === "false") {
      const notNotifiedLimit = Math.min(limit, 100);
      const listPromise = cargasRepository.findNotNotified({
        limit: notNotifiedLimit,
        offset,
        fields,
        ...sortOptions,
      });
      const totalPromise = includeTotal
        ? cargasRepository.countNotNotified()
        : Promise.resolve(null);
      [cargas, total] = await Promise.all([listPromise, totalPromise]);
    } else {
      const listPromise = cargasRepository.findAll({
        limit,
        offset,
        fields,
        ...sortOptions,
      });
      const totalPromise = includeTotal
        ? cargasRepository.count()
        : Promise.resolve(null);
      [cargas, total] = await Promise.all([listPromise, totalPromise]);
    }

    dbElapsedMs = getElapsedMs(dbStart);

    const payload = {
      cargas,
      pagination: {
        total,
        limit,
        offset,
      },
    };

    const etag = buildWeakEtag(payload);

    if (useServerCache) {
      setServerCache(cacheKey, payload, {
        ttlSeconds: cacheTtlSeconds,
        tags: ["cargas"],
      });
    }

    setCacheControl(set.headers, {
      visibility: "private",
      maxAge: 0,
      sMaxAge: cacheTtlSeconds,
      staleWhileRevalidate: cacheTtlSeconds * 3,
    });

    set.headers.ETag = etag;
    set.headers.Vary = "Cookie";
    set.headers["X-Cache"] = useServerCache ? "MISS" : "BYPASS";
    set.headers["Server-Timing"] = `db;dur=${dbElapsedMs}`;
    set.headers["X-Response-Time"] = `${getElapsedMs(start)}ms`;

    if (isEtagMatch(request, etag)) {
      set.status = 304;
      return "";
    }

    return payload;
  } catch (error) {
    console.error("[Cargas API] Error fetching cargas:", error);

    if ((error as { code?: string }).code === "42P01") {
      set.status = 503;
      return {
        error: "Database not initialized",
        message:
          "Required table is missing. Run migrations to initialize the database schema.",
      };
    }

    set.status = 500;
    return {
      error: "Internal server error",
      message: (error as Error).message,
    };
  }
}

export async function cargasCheckHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string };
}) {
  if (!isVercelCron(request) && !hasAdminApiKey(request)) {
    set.status = 401;
    return { error: "Unauthorized", message: "Invalid or missing API key" };
  }

  if (request.method !== "POST") {
    set.status = 405;
    return { error: "Method not allowed" };
  }

  try {
    if (process.env.TEST_MODE === "1") {
      const mockedError = request.headers.get("x-test-processor-error");
      if (mockedError) {
        throw new Error(mockedError);
      }

      const mockedResult = request.headers.get("x-test-processor-result");
      if (mockedResult) {
        const parsed = JSON.parse(mockedResult) as {
          processed?: number;
          new_cargas?: unknown[];
        };
        return {
          processed: parsed.processed ?? 0,
          new_cargas: parsed.new_cargas ?? [],
        };
      }
    }

    const result = await cargoProcessor.process();
    invalidateServerCacheByTag("cargas");
    invalidateServerCacheByTag("status");

    return {
      processed: result.processed,
      new_cargas: result.new_cargas,
    };
  } catch (error) {
    set.status = 500;
    return {
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "production"
          ? "Unexpected error"
          : (error as Error).message,
    };
  }
}

export async function cargasWebhookHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string };
}) {
  if (request.method !== "POST") {
    set.status = 405;
    return { error: "Method not allowed" };
  }

  const url = new URL(request.url);
  const secret =
    request.headers.get("x-cron-secret") ||
    url.searchParams.get("secret") ||
    "";
  const expectedSecret = process.env.CRON_WEBHOOK_SECRET || "";

  if (!expectedSecret || !timingSafeEqualString(secret, expectedSecret)) {
    set.status = 401;
    return {
      error: "Unauthorized",
      message: "Invalid or missing webhook secret",
    };
  }

  const source = request.headers.get("x-cron-source") || "unknown";

  try {
    if (process.env.TEST_MODE === "1") {
      const mockedError = request.headers.get("x-test-processor-error");
      if (mockedError) {
        throw new Error(mockedError);
      }

      const mockedResult = request.headers.get("x-test-processor-result");
      if (mockedResult) {
        const parsed = JSON.parse(mockedResult) as {
          processed?: number;
          new_cargas?: unknown[];
        };
        return {
          success: true,
          source,
          processed: parsed.processed ?? 0,
          new_cargas: parsed.new_cargas ?? [],
        };
      }
    }

    const result = await cargoProcessor.process();
    invalidateServerCacheByTag("cargas");
    invalidateServerCacheByTag("status");

    return {
      success: true,
      source,
      processed: result.processed,
      new_cargas: result.new_cargas,
    };
  } catch (error) {
    set.status = 500;
    return {
      error: "Internal server error",
      message: (error as Error).message,
    };
  }
}

export async function cargasHealthHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string };
}) {
  if (request.method !== "GET") {
    set.status = 405;
    return { error: "Method not allowed" };
  }

  try {
    const result = await query({
      text: `
        SELECT id_viagem, origem, destino, created_at, notificado_em
        FROM cargas
        ORDER BY created_at DESC
        LIMIT 5
      `,
    });

    const countResult = await query({
      text: `
        SELECT COUNT(*) as count
        FROM cargas
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `,
    });

    const lastCarga = result.rows[0];
    const minutesSinceLastCarga = lastCarga
      ? Math.floor(
          (Date.now() - new Date(lastCarga.created_at as string).getTime()) /
            60000,
        )
      : null;

    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 7 && hour <= 18;
    const shouldHaveRecentCargas =
      isBusinessHours && Number(minutesSinceLastCarga) > 30;

    return {
      status: shouldHaveRecentCargas ? "warning" : "healthy",
      message: shouldHaveRecentCargas
        ? "No cargas processed in last 30 minutes"
        : "Cron jobs appear to be running",
      stats: {
        last_24h_count: parseInt(String(countResult.rows[0]?.count || 0), 10),
        minutes_since_last_carga: minutesSinceLastCarga,
        last_carga: lastCarga
          ? {
              id_viagem: lastCarga.id_viagem,
              origem: lastCarga.origem,
              destino: lastCarga.destino,
              created_at: lastCarga.created_at,
              notificado_em: lastCarga.notificado_em,
            }
          : null,
      },
    };
  } catch (error) {
    set.status = 500;
    return {
      status: "error",
      error: (error as Error).message,
    };
  }
}
