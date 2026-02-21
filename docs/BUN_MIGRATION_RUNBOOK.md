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
- Bun API runs on `http://localhost:4000`
- `/api/v1/*` is always proxied by Next to Bun API through `API_ORIGIN`

## Bun API only

```bash
bun run api:dev
```

## Environment

- `API_ORIGIN` sets Bun API base URL for rewrites.
- `API_PORT` sets Bun API listen port.
- `SESSION_SECRET` signs/verifies the `cargo_session` cookie in both Next SSR guards and Bun API.

## Rollback model

There is no runtime toggle back to Next API handlers in this branch because `pages/api/v1/*` was removed.
Rollback must use deployment rollback to a previous release/branch.

## Production topology

- Deploy Next app on Vercel (root project).
- Deploy Bun API on Vercel as a separate project rooted at `apps/api` (Bun Function mode).
- Configure Vercel env:
  - `API_ORIGIN=https://<bun-api-project-domain>`
  - `SESSION_SECRET=<strong-random-secret>`
  - same DB/auth/webhook envs used by Bun API

## Vercel constraints

- `Bun.serve` is not supported in Vercel Functions.
- `apps/api` uses `api/[...all].ts` exporting an Elysia app for function-based Bun runtime.
- Local Bun server mode still uses `apps/api/src/index.ts`.

## Migrations

Keep existing migration strategy (`node-pg-migrate`) and run migrations in deploy pipeline before shifting traffic.
