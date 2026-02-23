import { cargasRepository } from "../../repositories/cargas-repository";
import {
  buildCacheKey,
  getServerCache,
  setServerCache,
} from "../../lib/server-cache";
import {
  buildWeakEtag,
  isEtagMatch,
  setCacheControl,
} from "../../lib/http-cache";
import { attachRequestIdHeader, createRequestLogger } from "../../lib/logger";
import { parseListCargasParams } from "./validators";
import { requireSession, isTestMode } from "./guards";

function getElapsedMs(start: number): number {
  return Math.round(performance.now() - start);
}

export async function cargasListHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) {
  const log = createRequestLogger(request).child({ handler: "cargas.index" });
  attachRequestIdHeader(set.headers, request);

  const sessionCheck = requireSession(request);
  if (!sessionCheck.success) {
    set.status = 401;
    log.warn("cargas.index.unauthorized");
    return { error: sessionCheck.error };
  }

  if (request.method !== "GET") {
    set.status = 405;
    log.warn("cargas.index.method_not_allowed", { method: request.method });
    return { error: "Method not allowed" };
  }

  const start = performance.now();
  let dbElapsedMs = 0;

  try {
    const url = new URL(request.url);
    const { params, error } = parseListCargasParams(url);

    if (error) {
      set.status = error.status;
      return { error: error.message };
    }

    const { limit, offset, notified, sortBy, sortOrder, includeTotal, fields } =
      params;

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
      ? await getServerCache<{
          cargas: unknown[];
          pagination: unknown;
        }>(cacheKey)
      : null;

    if (cachedPayload) {
      log.debug("cargas.index.cache_hit", { cache_key: cacheKey });
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
    log.info("cargas.index.loaded", {
      count: Array.isArray(cargas) ? cargas.length : 0,
      include_total: includeTotal,
      db_elapsed_ms: dbElapsedMs,
    });

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
      await setServerCache(cacheKey, payload, {
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
    log.error("cargas.index.failed", { error });

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
      message: "Unexpected error",
    };
  }
}
