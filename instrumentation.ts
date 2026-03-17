/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts (both in development and production).
 * Used to automatically apply pending database migrations on deployment.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  console.log("[instrumentation.register] Starting...");
  console.log("[instrumentation.register] NEXT_RUNTIME =", process.env.NEXT_RUNTIME);
  console.log("[instrumentation.register] NODE_ENV =", process.env.NODE_ENV);
  console.log("[instrumentation.register] cwd =", process.cwd());

  // Only run migrations on the Node.js runtime (not edge), and only once
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      console.log("[instrumentation.register] Importing runMigrations...");
      const { runMigrations } = await import("./apps/api/src/lib/run-migrations");
      console.log("[instrumentation.register] Running migrations...");
      await runMigrations();
      console.log("[instrumentation.register] Migrations completed successfully!");
    } catch (error) {
      console.error("[instrumentation.register] Error:", error);
    }
  } else {
    console.log("[instrumentation.register] Skipping - not Node.js runtime");
  }
}
