import { setupCronJobs } from "./cron-jobs";
import { logger } from "./lib/logger";

logger.info("cron_runner.starting");
setupCronJobs();

setInterval(() => {}, 60000);
