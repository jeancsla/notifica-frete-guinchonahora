import { query } from "../infra/database";
import { buildWeakEtag, isEtagMatch, setCacheControl } from "../lib/http-cache";
import {
  isWebhookTimestampValid,
  registerWebhookEventId,
} from "../lib/replay-protection";
import { attachRequestIdHeader, createRequestLogger } from "../lib/logger";
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

function hasAdminApiKey(request: Request) {
  const apiKey = request.headers.get("x-admin-key") || "";
  const expected = process.env.ADMIN_API_KEY || "";
  if (!apiKey || !expected) {
    return false;
  }

  return timingSafeEqualString(apiKey, expected);
}

function hasCronSecret(request: Request) {
  const secret = request.headers.get("x-cron-secret") || "";
  const expectedSecret = process.env.CRON_WEBHOOK_SECRET || "";
  if (!secret || !expectedSecret) {
    return false;
  }

  return timingSafeEqualString(secret, expectedSecret);
}

function hasSessionOrAdminAccess(request: Request) {
  return Boolean(getSessionUser(request)) || hasAdminApiKey(request);
}

function isValidCronEventId(value: string) {
  return /^[a-zA-Z0-9._:-]{1,128}$/.test(value);
}

function parseMockedResult(value: string) {
  try {
    return JSON.parse(value) as { processed?: number; new_cargas?: unknown[] };
  } catch {
    return null;
  }
}

function getContentLength(request: Request) {
  const raw = request.headers.get("content-length");
  if (!raw) {
    return 0;
  }

  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function cargasIndexHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}) {
  const log = createRequestLogger(request).child({ handler: "cargas.index" });
  attachRequestIdHeader(set.headers, request);

  if (!getSessionUser(request)) {
    set.status = 401;
    log.warn("cargas.index.unauthorized");
    return { error: "Unauthorized" };
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

export async function cargasCheckHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers?: Record<string, string | number> };
}) {
  const log = createRequestLogger(request).child({ handler: "cargas.check" });
  attachRequestIdHeader(set.headers, request);

  if (!hasAdminApiKey(request) && !hasCronSecret(request)) {
    set.status = 401;
    log.warn("cargas.check.unauthorized");
    return {
      error: "Unauthorized",
      message: "Invalid or missing admin API key / cron secret",
    };
  }

  if (request.method !== "POST") {
    set.status = 405;
    log.warn("cargas.check.method_not_allowed", { method: request.method });
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
        const parsed = parseMockedResult(mockedResult);
        if (!parsed) {
          set.status = 400;
          log.warn("cargas.check.invalid_mock_payload");
          return { error: "Invalid mocked result payload" };
        }
        log.info("cargas.check.mocked_response", {
          processed: parsed.processed ?? 0,
        });
        return {
          processed: parsed.processed ?? 0,
          new_cargas: parsed.new_cargas ?? [],
        };
      }
    }

    const result = await cargoProcessor.process();
    invalidateServerCacheByTag("cargas");
    invalidateServerCacheByTag("status");
    log.info("cargas.check.completed", {
      processed: result.processed,
      new_cargas_count: result.new_cargas.length,
    });

    return {
      processed: result.processed,
      new_cargas: result.new_cargas,
    };
  } catch (error) {
    log.error("cargas.check.failed", { error });
    set.status = 500;
    return {
      error: "Internal server error",
      message: "Unexpected error",
    };
  }
}

export async function cargasWebhookHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers?: Record<string, string | number> };
}) {
  const log = createRequestLogger(request).child({ handler: "cargas.webhook" });
  attachRequestIdHeader(set.headers, request);

  if (request.method !== "POST") {
    set.status = 405;
    log.warn("cargas.webhook.method_not_allowed", { method: request.method });
    return { error: "Method not allowed" };
  }

  const url = new URL(request.url);
  if (url.searchParams.has("secret")) {
    set.status = 400;
    log.warn("cargas.webhook.secret_in_query_rejected");
    return {
      error: "Bad request",
      message: "Webhook secret must be sent in x-cron-secret header",
    };
  }

  if (getContentLength(request) > 1_024) {
    set.status = 413;
    log.warn("cargas.webhook.payload_too_large", {
      content_length: request.headers.get("content-length"),
    });
    return { error: "Payload too large" };
  }

  if (!hasCronSecret(request)) {
    set.status = 401;
    log.warn("cargas.webhook.unauthorized");
    return {
      error: "Unauthorized",
      message: "Invalid or missing webhook secret",
    };
  }

  const timestampHeader = request.headers.get("x-cron-timestamp") || "";
  const timestampSeconds = parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestampSeconds)) {
    set.status = 400;
    log.warn("cargas.webhook.invalid_timestamp");
    return {
      error: "Bad request",
      message: "Missing or invalid x-cron-timestamp header",
    };
  }

  if (!isWebhookTimestampValid(timestampSeconds)) {
    set.status = 401;
    log.warn("cargas.webhook.expired_timestamp", {
      timestamp_seconds: timestampSeconds,
    });
    return { error: "Unauthorized", message: "Webhook timestamp expired" };
  }

  const cronEventId = request.headers.get("x-cron-id") || "";
  if (!isValidCronEventId(cronEventId)) {
    set.status = 400;
    log.warn("cargas.webhook.invalid_event_id");
    return {
      error: "Bad request",
      message: "Missing or invalid x-cron-id header",
    };
  }

  if (!registerWebhookEventId(cronEventId)) {
    set.status = 409;
    log.warn("cargas.webhook.replay_detected", { cron_event_id: cronEventId });
    return { error: "Conflict", message: "Webhook event already processed" };
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
        const parsed = parseMockedResult(mockedResult);
        if (!parsed) {
          set.status = 400;
          log.warn("cargas.webhook.invalid_mock_payload");
          return { error: "Invalid mocked result payload" };
        }
        log.info("cargas.webhook.mocked_response", {
          source,
          processed: parsed.processed ?? 0,
        });
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
    log.info("cargas.webhook.completed", {
      source,
      cron_event_id: cronEventId,
      processed: result.processed,
      new_cargas_count: result.new_cargas.length,
    });

    return {
      success: true,
      source,
      processed: result.processed,
      new_cargas: result.new_cargas,
    };
  } catch (error) {
    log.error("cargas.webhook.failed", { error, source });
    set.status = 500;
    return {
      error: "Internal server error",
      message: "Unexpected error",
    };
  }
}

export async function cargasHealthHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string; headers?: Record<string, string | number> };
}) {
  const log = createRequestLogger(request).child({ handler: "cargas.health" });
  attachRequestIdHeader(set.headers, request);

  if (request.method !== "GET") {
    set.status = 405;
    log.warn("cargas.health.method_not_allowed", { method: request.method });
    return { error: "Method not allowed" };
  }

  if (!hasSessionOrAdminAccess(request)) {
    set.status = 401;
    log.warn("cargas.health.unauthorized");
    return { error: "Unauthorized", message: "Invalid or missing credentials" };
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
    log.info("cargas.health.loaded", {
      minutes_since_last_carga: minutesSinceLastCarga,
      is_business_hours: isBusinessHours,
      status: shouldHaveRecentCargas ? "warning" : "healthy",
    });

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
    log.error("cargas.health.failed", { error });
    set.status = 500;
    return {
      status: "error",
      error: "Unexpected error",
    };
  }
}
