import cron from "node-cron";
import { logger } from "./lib/logger";
import { cargoProcessor } from "./services/cargo-processor";

let isRunning = false;
const log = logger.child({ component: "cron_jobs" });

export function setupCronJobs() {
  cron.schedule(
    "*/15 7-18 * * *",
    async () => {
      if (isRunning) {
        log.warn("cron.skipped_previous_job_running");
        return;
      }

      isRunning = true;

      try {
        const result = await cargoProcessor.process();
        log.info("cron.completed", { processed: result.processed });
      } catch (error) {
        log.error("cron.failed", { error });
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "America/Sao_Paulo",
    },
  );
}
