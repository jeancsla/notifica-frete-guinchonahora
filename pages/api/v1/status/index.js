import database from "infra/database.js";
import { buildWeakEtag, isEtagMatch, setCacheControl } from "lib/http-cache";
import {
  buildCacheKey,
  getServerCache,
  setServerCache,
} from "lib/server-cache";

async function status(request, response) {
  const start = process.hrtime.bigint();

  try {
    const cacheKey = buildCacheKey("status:v1");
    const cacheTtlSeconds = parseInt(
      process.env.API_CACHE_TTL_STATUS || "10",
      10,
    );
    const cachedPayload = getServerCache(cacheKey);

    if (cachedPayload) {
      const etag = buildWeakEtag(cachedPayload.dependencies);
      setCacheControl(response, {
        visibility: "public",
        maxAge: 0,
        sMaxAge: cacheTtlSeconds,
        staleWhileRevalidate: cacheTtlSeconds * 3,
      });
      response.setHeader("ETag", etag);
      response.setHeader("X-Cache", "HIT");
      response.setHeader("X-Response-Time", `${getElapsedMs(start)}ms`);

      if (isEtagMatch(request, etag)) {
        return response.status(304).end();
      }

      return response.status(200).json(cachedPayload);
    }

    const dbStart = process.hrtime.bigint();
    const databaseName = process.env.POSTGRES_DB || "";
    const statusResult = await database.query({
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
          version: statusResult.rows[0].server_version,
          max_connections: statusResult.rows[0].max_connections,
          opened_connections: statusResult.rows[0].opened_connections,
        },
      },
    };
    const etag = buildWeakEtag(payload.dependencies);

    setServerCache(cacheKey, payload, {
      ttlSeconds: cacheTtlSeconds,
      tags: ["status"],
    });

    setCacheControl(response, {
      visibility: "public",
      maxAge: 0,
      sMaxAge: cacheTtlSeconds,
      staleWhileRevalidate: cacheTtlSeconds * 3,
    });
    response.setHeader("ETag", etag);
    response.setHeader("X-Cache", "MISS");
    response.setHeader("Server-Timing", `db;dur=${dbElapsedMs}`);
    response.setHeader("X-Response-Time", `${getElapsedMs(start)}ms`);

    if (isEtagMatch(request, etag)) {
      return response.status(304).end();
    }

    response.status(200).json(payload);
  } catch (error) {
    return response.status(500).json({
      error: "Failed to load status",
      message: error.message,
    });
  }
}

export default status;

function getElapsedMs(start) {
  return Math.round(Number(process.hrtime.bigint() - start) / 1e6);
}
