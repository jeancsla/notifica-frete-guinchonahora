import setupCronJobs from "./cron-jobs.js";

console.log("[Cron Runner] Starting cron jobs...");
setupCronJobs();

// Keep the process alive
setInterval(() => {
  // Heartbeat to keep process running
}, 60000);

console.log("[Cron Runner] Cron jobs initialized. Process will stay alive.");
