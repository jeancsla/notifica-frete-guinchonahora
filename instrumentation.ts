/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts (both in development and production).
 * Used to automatically apply pending database migrations on deployment.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run migrations on the Node.js runtime (not edge), and only once
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./apps/api/src/lib/run-migrations");
    await runMigrations();
  }
}
