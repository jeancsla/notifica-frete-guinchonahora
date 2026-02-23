import { query } from "../infra/database";
import { buildWeakEtag, isEtagMatch, setCacheControl } from "../lib/http-cache";
import { attachRequestIdHeader, createRequestLogger } from "../lib/logger";
import { timingSafeEqualString } from "../lib/security";
import {
  buildCacheKey,
  getServerCache,
  setServerCache,
} from "../lib/server-cache";

function getElapsedMs(start: number) {
  return Math.round(performance.now() - start);
}

function hasAdminApiKey(request: Request) {
  const apiKey = request.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_API_KEY || "";
  if (!apiKey || !expected) {
    return false;
  }

  return timingSafeEqualString(apiKey, expected);
}

function shouldExposeDetails(request: Request) {
  if (process.env.STATUS_EXPOSE_DETAILS === "true") {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return hasAdminApiKey(request);
}

export async function statusHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) {
  const log = createRequestLogger(request).child({ handler: "status" });
  attachRequestIdHeader(set.headers, request);

  if (request.method !== "GET") {
    set.status = 405;
    log.warn("status.method_not_allowed", { method: request.method });
    return { error: "Method not allowed" };
  }

  const start = performance.now();
  const exposeDetails = shouldExposeDetails(request);
  const isProd = process.env.NODE_ENV === "production";
  const cacheVisibility: "public" | "private" =
    isProd && exposeDetails ? "private" : "public";

  try {
    const cacheKey = buildCacheKey("status:v1", { details: exposeDetails });
    const cacheTtlSeconds = parseInt(
      process.env.API_CACHE_TTL_STATUS || "10",
      10,
    );
    const cachedPayload = await getServerCache<{
      updated_at: string;
      dependencies: unknown;
    }>(cacheKey);

    if (cachedPayload) {
      log.debug("status.cache_hit", { details: exposeDetails });
      const etag = buildWeakEtag(cachedPayload.dependencies);
      setCacheControl(set.headers, {
        visibility: cacheVisibility,
        maxAge: 0,
        sMaxAge: cacheTtlSeconds,
        staleWhileRevalidate: cacheTtlSeconds * 3,
      });

      set.headers.ETag = etag;
      set.headers["X-Cache"] = "HIT";
      set.headers["X-Response-Time"] = `${getElapsedMs(start)}ms`;

      if (isEtagMatch(request, etag)) {
        set.status = 304;
        return "";
      }

      return cachedPayload;
    }

    const dbStart = performance.now();
    let database: {
      status: string;
      version?: string;
      max_connections?: number;
      opened_connections?: number;
    } = { status: "ok" };

    if (exposeDetails) {
      const databaseName = process.env.POSTGRES_DB || "";
      const statusResult = await query({
        text: `
          SELECT
            current_setting('server_version') AS server_version,
            current_setting('max_connections')::int AS max_connections,
            (
              SELECT COUNT(*)::int
              FROM pg_stat_activity
              WHERE datname = $1
            ) AS opened_connections;
        `,
        values: [databaseName],
      });

      database = {
        status: "ok",
        version: statusResult.rows[0]?.server_version,
        max_connections: statusResult.rows[0]?.max_connections,
        opened_connections: statusResult.rows[0]?.opened_connections,
      };
    } else {
      await query("SELECT 1;");
    }
    const dbElapsedMs = getElapsedMs(dbStart);
    log.info("status.loaded", {
      details: exposeDetails,
      db_elapsed_ms: dbElapsedMs,
    });

    const payload = {
      updated_at: new Date().toISOString(),
      dependencies: {
        database,
      },
    };

    const etag = buildWeakEtag(payload.dependencies);
    await setServerCache(cacheKey, payload, {
      ttlSeconds: cacheTtlSeconds,
      tags: ["status"],
    });

    setCacheControl(set.headers, {
      visibility: cacheVisibility,
      maxAge: 0,
      sMaxAge: cacheTtlSeconds,
      staleWhileRevalidate: cacheTtlSeconds * 3,
    });

    set.headers.ETag = etag;
    set.headers["X-Cache"] = "MISS";
    set.headers["Server-Timing"] = `db;dur=${dbElapsedMs}`;
    set.headers["X-Response-Time"] = `${getElapsedMs(start)}ms`;

    if (isEtagMatch(request, etag)) {
      set.status = 304;
      return "";
    }

    return payload;
  } catch (error) {
    log.error("status.failed", { error });
    set.status = 500;
    return {
      error: "Failed to load status",
      message: "Unexpected error",
    };
  }
}
