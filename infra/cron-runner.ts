import setupCronJobs from "./cron-jobs";

console.log("[Cron Runner] Starting cron jobs...");
setupCronJobs();

setInterval(() => {
  // Keep process alive.
}, 60000);

console.log("[Cron Runner] Cron jobs initialized. Process will stay alive.");
