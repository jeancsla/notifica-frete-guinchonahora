import cargoProcessor from "services/cargo-processor.js";

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
    const result = await cargoProcessor.process();

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
