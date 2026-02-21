import { setupCronJobs } from "./cron-jobs";

console.log("[Cron Runner] Starting cron jobs...");
setupCronJobs();

setInterval(() => {}, 60000);
