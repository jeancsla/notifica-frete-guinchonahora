import cargasRepository from "repositories/cargas-repository.js";

async function cargasHandler(request, response) {
  if (request.method === "GET") {
    return handleGet(request, response);
  }

  return response.status(405).json({ error: "Method not allowed" });
}

async function handleGet(request, response) {
  try {
    // Parse query parameters
    const url = new URL(request.url, `http://${request.headers.host}`);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const notified = url.searchParams.get("notified");

    // Validate and parse limit
    const limit = limitParam ? parseInt(limitParam) : 10;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return response.status(400).json({
        error: "Invalid limit parameter. Must be between 1 and 100.",
      });
    }

    // Validate and parse offset
    const offset = offsetParam ? parseInt(offsetParam) : 0;
    if (isNaN(offset) || offset < 0) {
      return response.status(400).json({
        error: "Invalid offset parameter. Must be non-negative.",
      });
    }

    let cargas;
    let total;

    if (notified === "false") {
      // Get only not notified cargas WITH pagination
      const notNotifiedLimit = Math.min(limit, 100); // Cap at 100 for this endpoint
      cargas = await cargasRepository.findNotNotified({ limit: notNotifiedLimit, offset });
      total = await cargasRepository.countNotNotified();
    } else {
      // Get all cargas with pagination
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

export default cargasHandler;
