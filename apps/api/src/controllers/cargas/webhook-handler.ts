import { cargoProcessor } from "../../services/cargo-processor";
import {
  isWebhookTimestampValid,
  registerWebhookEventId,
} from "../../lib/replay-protection";
import { invalidateServerCacheByTag } from "../../lib/server-cache";
import { attachRequestIdHeader, createRequestLogger } from "../../lib/logger";
import { hasCronSecret, isTestMode } from "./guards";
import {
  isValidCronEventId,
  getContentLength,
  parseMockedResult,
} from "./validators";

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

  if (!(await registerWebhookEventId(cronEventId))) {
    set.status = 409;
    log.warn("cargas.webhook.replay_detected", { cron_event_id: cronEventId });
    return { error: "Conflict", message: "Webhook event already processed" };
  }

  const source = request.headers.get("x-cron-source") || "unknown";

  try {
    if (isTestMode()) {
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
    await invalidateServerCacheByTag("cargas");
    await invalidateServerCacheByTag("status");
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
