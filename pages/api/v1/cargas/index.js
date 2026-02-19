import { buildWeakEtag, isEtagMatch, setCacheControl } from "lib/http-cache";
import {
  buildCacheKey,
  getServerCache,
  setServerCache,
} from "lib/server-cache";
import { getSession } from "lib/session";
import cargasRepository from "repositories/cargas-repository.js";

async function cargasHandler(request, response) {
  const session = await getSession(request, response);

  if (!session.user) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  if (request.method === "GET") {
    return handleGet(request, response);
  }

  return response.status(405).json({ error: "Method not allowed" });
}

export default cargasHandler;

async function handleGet(request, response) {
  const start = process.hrtime.bigint();
  let dbElapsedMs = 0;

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const notified = url.searchParams.get("notified");
    const sortBy = url.searchParams.get("sortBy");
    const sortOrder = url.searchParams.get("sortOrder");
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
      return response.status(400).json({
        error: "Invalid limit parameter. Must be between 1 and 100.",
      });
    }

    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    if (isNaN(offset) || offset < 0) {
      return response.status(400).json({
        error: "Invalid offset parameter. Must be non-negative.",
      });
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
    const cachedPayload = getServerCache(cacheKey);

    if (cachedPayload) {
      const etag = buildWeakEtag(cachedPayload);
      setCacheControl(response, {
        visibility: "private",
        maxAge: 0,
        sMaxAge: cacheTtlSeconds,
        staleWhileRevalidate: cacheTtlSeconds * 3,
      });
      response.setHeader("ETag", etag);
      response.setHeader("Vary", "Cookie");
      response.setHeader("X-Cache", "HIT");
      response.setHeader("X-Response-Time", `${getElapsedMs(start)}ms`);

      if (isEtagMatch(request, etag)) {
        return response.status(304).end();
      }

      return response.status(200).json(cachedPayload);
    }

    let cargas;
    let total = null;

    const sortOptions = {};
    if (sortBy) sortOptions.sortBy = sortBy;
    if (sortOrder) sortOptions.sortOrder = sortOrder;

    const dbStart = process.hrtime.bigint();

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

    setServerCache(cacheKey, payload, {
      ttlSeconds: cacheTtlSeconds,
      tags: ["cargas"],
    });

    setCacheControl(response, {
      visibility: "private",
      maxAge: 0,
      sMaxAge: cacheTtlSeconds,
      staleWhileRevalidate: cacheTtlSeconds * 3,
    });
    response.setHeader("ETag", etag);
    response.setHeader("Vary", "Cookie");
    response.setHeader("X-Cache", "MISS");
    response.setHeader("Server-Timing", `db;dur=${dbElapsedMs}`);
    response.setHeader("X-Response-Time", `${getElapsedMs(start)}ms`);

    if (isEtagMatch(request, etag)) {
      return response.status(304).end();
    }

    return response.status(200).json(payload);
  } catch (error) {
    console.error("[Cargas API] Error fetching cargas:", error);

    if (error?.code === "42P01") {
      return response.status(503).json({
        error: "Database not initialized",
        message:
          "Required table is missing. Run migrations to initialize the database schema.",
      });
    }

    return response.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

function getElapsedMs(start) {
  return Math.round(Number(process.hrtime.bigint() - start) / 1e6);
}
