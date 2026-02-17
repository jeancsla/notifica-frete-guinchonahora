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
    const limit = parseInt(url.searchParams.get("limit")) || 10;
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    const notified = url.searchParams.get("notified");

    // Validate parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return response.status(400).json({
        error: "Invalid limit parameter. Must be between 1 and 100.",
      });
    }

    if (isNaN(offset) || offset < 0) {
      return response.status(400).json({
        error: "Invalid offset parameter. Must be non-negative.",
      });
    }

    let cargas;
    let total;

    if (notified === "false") {
      // Get only not notified cargas (no pagination for this filter)
      cargas = await cargasRepository.findNotNotified();
      total = cargas.length;
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
