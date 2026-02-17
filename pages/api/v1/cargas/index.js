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
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const notified = url.searchParams.get("notified");

    const limit = limitParam ? parseInt(limitParam) : 10;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return response.status(400).json({
        error: "Invalid limit parameter. Must be between 1 and 100.",
      });
    }

    const offset = offsetParam ? parseInt(offsetParam) : 0;
    if (isNaN(offset) || offset < 0) {
      return response.status(400).json({
        error: "Invalid offset parameter. Must be non-negative.",
      });
    }

    let cargas;
    let total;

    if (notified === "false") {
      const notNotifiedLimit = Math.min(limit, 100);
      cargas = await cargasRepository.findNotNotified({
        limit: notNotifiedLimit,
        offset,
      });
      total = await cargasRepository.countNotNotified();
    } else {
      cargas = await cargasRepository.findAll({ limit, offset });
      total = await cargasRepository.count();
    }

    return response.status(200).json({
      cargas,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[Cargas API] Error fetching cargas:", error);
    return response.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
