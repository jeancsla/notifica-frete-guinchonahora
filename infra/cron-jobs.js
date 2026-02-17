import cron from "node-cron";
import cargoProcessor from "services/cargo-processor.js";

// Flag to prevent overlapping executions
let isRunning = false;

function setupCronJobs() {
  console.log("[Cron] Setting up scheduled jobs...");

  // Run every 15 minutes between 7:00 and 18:00
  // Cron format: minute hour day month day-of-week
  cron.schedule(
    "*/15 7-18 * * *",
    async () => {
      if (isRunning) {
        console.log("[Cron] Previous job still running, skipping...");
        return;
      }

      isRunning = true;
      console.log("[Cron] Starting scheduled cargo check...");

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
    }
  );

  console.log("[Cron] Jobs scheduled successfully");
}

export default setupCronJobs;
