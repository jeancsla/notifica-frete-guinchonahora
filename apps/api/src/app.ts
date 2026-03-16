import { Elysia } from "elysia";
import { API_ROUTES } from "../../../packages/shared/src/api";
import {
  userHandler,
  logoutHandler,
  loginHandler,
} from "./controllers/auth-controller";
import {
  cargasCheckHandler,
  cargasHealthHandler,
  cargasListHandler,
  cargasWebhookHandler,
} from "./controllers/cargas";
import { migrationsHandler } from "./controllers/migrations-controller";
import { rootHandler } from "./controllers/root-controller";
import { statusHandler } from "./controllers/status-controller";
import { metricsHandler } from "./controllers/metrics-controller";
import { getGlobalRateLimitState, recordGlobalRequest } from "./lib/rate-limit";
import { logger } from "./lib/logger";

const log = logger.child({ component: "app" });

export function createApp() {
  const app = new Elysia()
    .get("/", () => ({
      status: "ok",
      service: "bun-api",
      api_prefix: "/api/v1",
    }))
    // Global rate limiting middleware (EC-5: spray attack prevention)
    .onBeforeHandle(async (context) => {
      const ip =
        context.request.headers.get("x-forwarded-for") ||
        context.request.headers.get("cf-connecting-ip") ||
        context.request.headers.get("x-real-ip") ||
        "unknown";

      const state = await getGlobalRateLimitState(ip);
      if (state.blocked) {
        log.warn("rate_limit.global_limit_exceeded", {
          ip,
          retry_after: state.retryAfterSeconds,
        });
        return new Response("Rate limit exceeded", {
          status: 429,
          headers: {
            "Retry-After": String(state.retryAfterSeconds),
          },
        });
      }

      // Record the request for rate limiting
      await recordGlobalRequest(ip);
    })
    .all(API_ROUTES.root, rootHandler)
    .all(API_ROUTES.status, statusHandler)
    .all(API_ROUTES.cargas, cargasListHandler)
    .all(API_ROUTES.cargasCheck, cargasCheckHandler)
    .all(API_ROUTES.cargasWebhook, cargasWebhookHandler)
    .all(API_ROUTES.cargasHealth, cargasHealthHandler)
    .all(API_ROUTES.migrations, migrationsHandler)
    .all(API_ROUTES.authLogin, loginHandler)
    .all(API_ROUTES.authLogout, logoutHandler)
    .all(API_ROUTES.authUser, userHandler)
    .get(API_ROUTES.metrics, metricsHandler);

  return app;
}
