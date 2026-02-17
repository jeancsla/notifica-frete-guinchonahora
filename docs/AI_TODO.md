# AI Implementation TODO

This document is a step-by-step, objective implementation plan. Each step includes **why**, **how**, and the **expected result**. Follow the steps in order.

1. **Lock down sensitive API endpoints**
   - **Why:** `POST /api/v1/migrations` and `POST /api/v1/cargas/check` are currently unauthenticated and can be abused.
   - **How:** Add an API key check (e.g., `X-Admin-Key`) and validate against `process.env.ADMIN_API_KEY` inside `pages/api/v1/migrations/index.js` and `pages/api/v1/cargas/check.js`. Return `401` on missing/invalid key.
   - **Expected result:** Only authorized callers can run migrations or trigger notifications.

2. **Disable migrations endpoint in production**
   - **Why:** Running migrations from a public API is risky in production.
   - **How:** Add a guard using `process.env.NODE_ENV === "production"` or a `MIGRATIONS_ENABLED` env flag. Return `404` or `403` when disabled.
   - **Expected result:** Production environment cannot run migrations via API.

3. **Fix invalid API route**
   - **Why:** `pages/api/v1/index.js` exports a React component, which is invalid for API routes and will error.
   - **How:** Convert it into a proper API handler (e.g., `res.status(200).json({ ok: true })`) or move the component to `pages/index.js`.
   - **Expected result:** `/api/v1` no longer throws runtime errors.

4. **Make the cron actually run**
   - **Why:** `infra/cron-jobs.js` is defined but never started, so scheduled checks never happen.
   - **How:** Create `infra/cron-runner.js` that imports and calls `setupCronJobs()`. Add `npm run cron` to `package.json`, and document how to run it in production (PM2/systemd/container).
   - **Expected result:** Scheduled jobs execute every 15 minutes between 07:00–18:00.

5. **Set explicit cron timezone**
   - **Why:** Host timezone differences can shift the run schedule.
   - **How:** Pass `timezone: "America/Sao_Paulo"` to `cron.schedule` in `infra/cron-jobs.js`.
   - **Expected result:** Jobs run at intended local business hours regardless of host timezone.

6. **Protect credentials and PII in docs**
   - **Why:** Docs include real-looking usernames, passwords, and phone numbers.
   - **How:** Replace with placeholders and add `.env.example` listing required variables with dummy values.
   - **Expected result:** No sensitive data in version control and clearer setup guidance.

7. **Add secret scanning to CI**
   - **Why:** Secrets can slip into PRs; `secretlint` only runs locally in pre-commit.
   - **How:** Add a GitHub Actions job in `.github/workflows/linting.yaml` to run `npx secretlint "**/*"`.
   - **Expected result:** CI blocks PRs that contain secrets.

8. **Harden scraper login success checks**
   - **Why:** Login currently doesn’t verify success or update cookies.
   - **How:** Validate login response (status, redirect, or expected HTML marker). If login sets new cookies, merge them. Throw a clear error when login fails.
   - **Expected result:** Scraper fails loudly on auth changes and reduces silent errors.

9. **Continue processing if one notification fails**
   - **Why:** A single WhatsApp failure aborts the whole run.
   - **How:** Wrap each notification in `try/catch`, collect errors, and continue with the next carga. Return `{ processed, failed }` with failure details.
   - **Expected result:** Best-effort notifications with full error reporting.

10. **Avoid N+1 DB queries when deduplicating**
    - **Why:** Per-carga `exists()` calls are slow at scale.
    - **How:** Fetch existing `id_viagem` in one query: `SELECT id_viagem FROM cargas WHERE id_viagem = ANY($1)` and filter in memory.
    - **Expected result:** Faster processing on large carga lists.

11. **Paginate `findNotNotified()`**
    - **Why:** Current query returns all records and can grow unbounded.
    - **How:** Add `limit`/`offset` to repository and API for `notified=false`.
    - **Expected result:** Predictable response size and better performance.

12. **Guard DB client cleanup**
    - **Why:** `infra/database.js` calls `client.end()` even if the client creation failed.
    - **How:** Check `if (client)` before calling `client.end()`.
    - **Expected result:** Fewer cascading errors during DB connection issues.

13. **Add Postgres healthcheck to Docker Compose**
    - **Why:** Improves startup reliability and reduces flaky tests.
    - **How:** Add a `healthcheck` to `infra/compose.yaml` and update `infra/scripts/wait-for-postgres.js` to poll container health.
    - **Expected result:** More reliable local startup and test runs.

14. **Pin Node.js version for dev/prod parity**
    - **Why:** CI uses Node `24.11.1` while local may differ.
    - **How:** Add `.nvmrc` or `engines` in `package.json`.
    - **Expected result:** Consistent runtime across environments.

15. **Expand tests for new behavior**
    - **Why:** New auth, pagination, and cron runner require coverage.
    - **How:** Add integration tests for unauthorized access, pagination on `notified=false`, and cron runner initialization.
    - **Expected result:** Regression protection for key upgrades.
