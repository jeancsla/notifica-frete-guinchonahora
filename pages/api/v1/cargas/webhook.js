import cargoProcessor from "services/cargo-processor.js";
import { invalidateServerCacheByTag } from "lib/server-cache";

const isProd = process.env.NODE_ENV === "production";

/**
 * Webhook endpoint for external cron triggers (n8n, self-hosted, etc.)
 * Protected by CRON_WEBHOOK_SECRET
 */
async function webhookHandler(request, response) {
  // Verify secret
  const secret = request.headers["x-cron-secret"] || request.query.secret;
  const expectedSecret = process.env.CRON_WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return response.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing webhook secret",
    });
  }

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const source = request.headers["x-cron-source"] || "unknown";
  console.log(`[Webhook] Cron triggered from: ${source}`);

  try {
    // Allow test mode mocking to avoid external HTTP calls
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
          success: true,
          source,
          processed: parsed.processed ?? 0,
          new_cargas: parsed.new_cargas ?? [],
        });
      }
    }

    const result = await cargoProcessor.process();
    invalidateServerCacheByTag("cargas");
    invalidateServerCacheByTag("status");

    console.log(
      `[Webhook] Completed. Processed: ${result.processed}, New: ${result.new_cargas?.length || 0}`,
    );

    return response.status(200).json({
      success: true,
      source,
      processed: result.processed,
      new_cargas: result.new_cargas,
    });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return response.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

export default webhookHandler;
