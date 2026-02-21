import cron from "node-cron";
import { cargoProcessor } from "./services/cargo-processor";

let isRunning = false;

export function setupCronJobs() {
  cron.schedule(
    "*/15 7-18 * * *",
    async () => {
      if (isRunning) {
        console.log("[Cron] Previous job still running, skipping...");
        return;
      }

      isRunning = true;

      try {
        const result = await cargoProcessor.process();
        console.log(`[Cron] Completed. Processed ${result.processed} cargas`);
      } catch (error) {
        console.error("[Cron] Error processing cargas:", error);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "America/Sao_Paulo",
    },
  );
}
