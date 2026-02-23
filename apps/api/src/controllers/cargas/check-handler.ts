import { cargoProcessor } from "../../services/cargo-processor";
import { invalidateServerCacheByTag } from "../../lib/server-cache";
import { attachRequestIdHeader, createRequestLogger } from "../../lib/logger";
import { hasAdminApiKey, hasCronSecret, isTestMode } from "./guards";
import { parseMockedResult } from "./validators";

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
    await invalidateServerCacheByTag("cargas");
    await invalidateServerCacheByTag("status");
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
