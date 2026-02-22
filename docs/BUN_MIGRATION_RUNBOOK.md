# Bun Migration Runbook

## Local development

1. Start Postgres, migrations, Next, and Bun API:

```bash
bun run dev
```

### Startup preflight (port/lock protection)

`bun run dev` now runs `preflight:dev` first.

This preflight blocks startup when:

- Port `3000` (Next dev) is already in use.
- Port `API_PORT`/`4000` (Bun API) is already in use.

It also removes stale `.next/dev/lock` only when no local `next dev` process is running.
This prevents the common `Unable to acquire lock ... .next/dev/lock` failure and accidental fallback to port `3001`.

Recovery commands:

```bash
bun run dev:stop
bun run dev
```

2. Runtime topology:

- Next runs on `http://localhost:3000`
- `/api/v1/*` is handled inside this same Next app via `app/api/v1/[...all]/route.js`
- Optional dual-process mode: set `API_ORIGIN=http://localhost:4000` and run Bun API separately

## Bun API only

```bash
bun run api:dev
```

## Environment

- `API_ORIGIN` is optional.
- When set, `/api/v1/*` is rewritten to that external Bun API origin (dual/split deploy mode).
- When unset, API requests are served internally in the same Vercel/Next deployment (mono deploy mode).
- `API_PORT` sets Bun API listen port.
- `SESSION_SECRET` signs/verifies the `cargo_session` cookie in both Next SSR guards and Bun API.

## Rollback model

There is no runtime toggle back to Next API handlers in this branch because `pages/api/v1/*` was removed.
Rollback must use deployment rollback to a previous release/branch.

## Production topology

- Deploy only the root Next app on Vercel (single project / mono deploy).
- API routes are served by the same deployment at `/api/v1/*`.
- Configure Vercel env:
  - `NEXT_PUBLIC_APP_URL=https://<next-app-domain>`
  - `SESSION_SECRET=<strong-random-secret>`
  - same DB/auth/webhook envs used by API handlers
  - leave `API_ORIGIN` unset for mono deploy

## Vercel constraints

- `Bun.serve` is not supported in Vercel Functions.
- Mono deploy uses Next route handlers (`app/api/v1/[...all]/route.js`) that invoke the Elysia app.
- Local Bun server mode still uses `apps/api/src/index.ts`.

## Migrations

Keep existing migration strategy (`node-pg-migrate`) and run migrations in deploy pipeline before shifting traffic.
