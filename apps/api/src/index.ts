import { validateEnv } from "./lib/env-validator";
import { createApp } from "./app";
import { logger } from "./lib/logger";

// Validate environment variables before starting the app
validateEnv();

const port = Number(process.env.API_PORT || process.env.PORT || 4000);

createApp().listen(port);

logger.info("api.started", { port });
