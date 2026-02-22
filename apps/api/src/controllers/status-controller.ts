import { query } from "../infra/database";
import { buildWeakEtag, isEtagMatch, setCacheControl } from "../lib/http-cache";
import {
  buildCacheKey,
  getServerCache,
  setServerCache,
} from "../lib/server-cache";

function getElapsedMs(start: number) {
  return Math.round(performance.now() - start);
}

export async function statusHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) {
  if (request.method !== "GET") {
    set.status = 405;
    return { error: "Method not allowed" };
  }

  const start = performance.now();

  try {
    const cacheKey = buildCacheKey("status:v1");
    const cacheTtlSeconds = parseInt(
      process.env.API_CACHE_TTL_STATUS || "10",
      10,
    );
    const cachedPayload = getServerCache<{
      updated_at: string;
      dependencies: unknown;
    }>(cacheKey);

    if (cachedPayload) {
      const etag = buildWeakEtag(cachedPayload.dependencies);
      setCacheControl(set.headers, {
        visibility: "public",
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
    const dbElapsedMs = getElapsedMs(dbStart);

    const payload = {
      updated_at: new Date().toISOString(),
      dependencies: {
        database: {
          version: statusResult.rows[0]?.server_version,
          max_connections: statusResult.rows[0]?.max_connections,
          opened_connections: statusResult.rows[0]?.opened_connections,
        },
      },
    };

    const etag = buildWeakEtag(payload.dependencies);
    setServerCache(cacheKey, payload, {
      ttlSeconds: cacheTtlSeconds,
      tags: ["status"],
    });

    setCacheControl(set.headers, {
      visibility: "public",
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
    set.status = 500;
    return {
      error: "Failed to load status",
      message: (error as Error).message,
    };
  }
}
