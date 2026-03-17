/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts on Node.js runtime.
 * Used to automatically apply pending database migrations on deployment.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Instrumentation hook runs in both Node.js and Edge runtimes
  // Only run migrations on Node.js (not edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      console.log("[instrumentation] Starting migrations...");
      const { runMigrations } = await import("./apps/api/src/lib/run-migrations");
      await runMigrations();
      console.log("[instrumentation] Migrations completed");
    } catch (error) {
      console.error("[instrumentation] Error:", error instanceof Error ? error.message : String(error));
    }
  }
}
