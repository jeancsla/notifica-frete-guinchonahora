import crypto from "crypto";
import cargoProcessor from "services/cargo-processor.js";

const isProd = process.env.NODE_ENV === "production";

function checkAuth(request, response) {
  const apiKey = request.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!apiKey || !expectedKey) {
    response
      .status(401)
      .json({ error: "Unauthorized", message: "Invalid or missing API key" });
    return false;
  }

  try {
    const bufferA = Buffer.from(apiKey);
    const bufferB = Buffer.from(expectedKey);

    if (
      bufferA.length !== bufferB.length ||
      !crypto.timingSafeEqual(bufferA, bufferB)
    ) {
      throw new Error("Invalid key");
    }
  } catch (e) {
    response
      .status(401)
      .json({ error: "Unauthorized", message: "Invalid or missing API key" });
    return false;
  }

  return true;
}

async function checkHandler(request, response) {
  if (!checkAuth(request, response)) {
    return;
  }

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (process.env.TEST_MODE === "1") {
      const mockedError = request.headers["x-test-processor-error"];
      if (mockedError) {
        throw new Error(
          Array.isArray(mockedError) ? mockedError[0] : mockedError,
        );
      }

      const mockedResult = request.headers["x-test-processor-result"];
      if (mockedResult) {
        const parsed = JSON.parse(
          Array.isArray(mockedResult) ? mockedResult[0] : mockedResult,
        );
        return response.status(200).json({
          processed: parsed.processed ?? 0,
          new_cargas: parsed.new_cargas ?? [],
        });
      }
    }

    console.log("[Check API] Starting manual cargo check...");

    const result = await cargoProcessor.process();

    return response.status(200).json({
      processed: result.processed,
      new_cargas: result.new_cargas,
    });
  } catch (error) {
    console.error("[Check API] Error processing cargas:", error);
    return response.status(500).json({
      error: "Internal server error",
      message: isProd ? "Unexpected error" : error.message,
    });
  }
}

export default checkHandler;
