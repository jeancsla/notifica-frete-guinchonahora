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
  cargasIndexHandler,
  cargasWebhookHandler,
} from "./controllers/cargas-controller";
import { migrationsHandler } from "./controllers/migrations-controller";
import { rootHandler } from "./controllers/root-controller";
import { statusHandler } from "./controllers/status-controller";

export function createApp() {
  return new Elysia()
    .get("/", () => ({
      status: "ok",
      service: "bun-api",
      api_prefix: "/api/v1",
    }))
    .all(API_ROUTES.root, rootHandler)
    .all(API_ROUTES.status, statusHandler)
    .all(API_ROUTES.cargas, cargasIndexHandler)
    .all(API_ROUTES.cargasCheck, cargasCheckHandler)
    .all(API_ROUTES.cargasWebhook, cargasWebhookHandler)
    .all(API_ROUTES.cargasHealth, cargasHealthHandler)
    .all(API_ROUTES.migrations, migrationsHandler)
    .all(API_ROUTES.authLogin, loginHandler)
    .all(API_ROUTES.authLogout, logoutHandler)
    .all(API_ROUTES.authUser, userHandler);
}
