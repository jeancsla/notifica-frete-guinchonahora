## Workflow Orchestration

### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js application that monitors the Tegma/Mills transportation website for available cargo loads and sends WhatsApp notifications when new cargas are found. This is a migration from an n8n workflow to a custom Node.js implementation.

- **Runtime:** Bun >= 1.3.9
- **Framework:** Next.js 16 with Pages Router + Elysia API
- **Database:** PostgreSQL with `pg` driver and `node-pg-migrate`
- **Architecture:** Monorepo with workspace packages

## Common Commands

**Development:**

```bash
bun run dev              # Start full dev stack (DB, migrations, Next.js :3000, Bun API :4000)
bun run dev:web          # Start only web (with mono API mode)
bun run dev:stop         # Kill all dev processes
bun run services:up      # Start PostgreSQL Docker container
bun run services:down    # Stop and remove Docker container
```

**Testing:**

```bash
bun run test             # Run all tests (API + web)
bun run test:api         # Run API tests only (apps/api)
bun run test:web         # Run web tests (unit + UI + integration)
bun run test:unit        # Run unit tests (tests/unit)
bun run test:ui          # Run UI component tests (tests/ui)
bun run test:integration:all    # Run all integration tests
bun run test:integration:api    # Run API integration tests only
bun run test:integration:services  # Run service integration tests
bun run test:watch       # Run tests in watch mode
```

**Linting/Formatting:**

```bash
bun run lint             # Run ESLint + Prettier check
bun run lint:prettier:fix # Fix Prettier formatting
```

**Database:**

```bash
bun run migration:create <name>   # Create new migration file
bun run migration:up              # Run pending migrations
bun run migration:down            # Rollback last migration
```

**Cron:**

```bash
bun run cron             # Run cron worker standalone (for scheduled execution)
```

## Architecture

### Monorepo Structure

```
├── apps/api/              # Bun Elysia API (standalone server)
│   ├── src/
│   │   ├── controllers/   # Route handlers (auth, cargas, migrations, status)
│   │   ├── services/      # Business logic (cargo-processor, tegma-scraper, whatsapp-notifier)
│   │   ├── repositories/  # Database access layer
│   │   ├── lib/           # Utilities (logger, security, session, rate-limit)
│   │   └── infra/         # Database connection
│   └── src/index.ts       # API entry point
├── packages/shared/       # Shared types and models
│   └── src/
│       ├── models/Carga.ts    # Domain model with validation
│       ├── types/index.ts     # TypeScript interfaces
│       └── api.ts             # Route definitions
├── pages/                 # Next.js Pages Router (dashboard UI)
├── components/            # React components
├── app/api/v1/[...all]/   # Mono deploy: Next.js API routes proxy to Elysia
├── infra/                 # Docker, migrations, scripts
└── tests/                 # Test suites
```

### Layered Architecture

**API Layer (apps/api/src/):**

- **Controllers** - HTTP request/response handling, auth checks
- **Services** - Business logic and external integrations
- **Repositories** - SQL queries using `pg`
- **Models** - Domain entities in `packages/shared/src/models/`

**Key Services:**

1. **Tegma Scraper** (`services/tegma-scraper.ts`): Scrapes `gestaotegmatransporte.ventunolog.com.br`
   - Flow: get cookie → login → fetch cargas page → parse HTML with Cheerio
   - All HTTP calls have 5 retries with exponential backoff (disabled in test mode)

2. **WhatsApp Notifier** (`services/whatsapp-notifier.ts`): Integrates with Evolution API
   - Instance: configured via `EVOLUTION_API_INSTANCE` env var
   - Sends notifications to Jean and Jefferson when new cargas are found

3. **Cargo Processor** (`services/cargo-processor.ts`): Orchestrates the workflow
   - fetch → deduplicate (using `existsBatch`) → save → notify → mark as notified

### Dual Deploy Mode

The API can run in two modes:

1. **Mono deploy** (default): `app/api/v1/[...all]/route.ts` proxies to Elysia app
   - Set `API_ORIGIN=` (empty) in `.env.development`
   - Used for simple deployments (Vercel, single server)

2. **Separate API**: Bun API runs on separate port (`:4000`)
   - Set `API_ORIGIN=http://localhost:4000`
   - Next.js rewrites `/api/v1/*` to external API

### Authentication & Security

- **Session-based auth**: HMAC-signed cookies (`cargo_session`)
- **Admin API Key**: `x-admin-key` header for protected endpoints (migrations, manual cargo check)
- **Cron Webhook**: `x-cron-secret` + timestamp validation for external schedulers
- **Rate limiting**: Login endpoint has configurable rate limiting

### Database

- Uses `node-pg-migrate` for migrations in `infra/migrations/`
- Key table: `cargas` with UNIQUE constraint on `id_viagem` for deduplication
- RLS (Row Level Security) enabled via migrations
- Connection module: `apps/api/src/infra/database.ts`

### Scheduled Jobs

Cron job defined in `apps/api/src/cron-jobs.ts`:

- Schedule: `*/15 7-18 * * *` (every 15 minutes, 7AM-6PM BRT)
- Timezone: `America/Sao_Paulo`
- Prevents overlapping executions with `isRunning` flag
- Can also be triggered via webhook: `POST /api/v1/cargas/webhook`

## Testing Approach

- **Framework:** Bun's built-in test runner
- **Pattern:** Integration tests primarily; unit tests for utilities
- **External calls:** Mocked via `fetch` mocking
- **Database:** Real database calls; cleaned before/after each test
- **Test types:**
  - `tests/unit/` - Unit tests
  - `tests/ui/` - React component tests
  - `tests/integration/` - API, repository, service, model tests

## Environment Variables

Required in `.env.development`:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=local_user
POSTGRES_DB=local_db
POSTGRES_PASSWORD=localpassword
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB

# Tegma/Mills (for scraping)
TEGMA_BASE_URL=https://gestaotegmatransporte.ventunolog.com.br
TEGMA_USERNAME=your_username
TEGMA_PASSWORD=your_password

# Evolution API (for WhatsApp)
EVOLUTION_API_BASE_URL=
EVOLUTION_API_INSTANCE=guincho2
EVOLUTION_API_KEY=

# Notification recipients
NOTIFY_JEAN_PHONE=5512XXXXXXXXX
NOTIFY_JEFFERSON_PHONE=5512XXXXXXXXX
NOTIFY_SEBASTIAO_PHONE=5512XXXXXXXXX

# Admin & Security
ADMIN_API_KEY=your_secure_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
SESSION_SECRET=min_32_chars_long
CRON_WEBHOOK_SECRET=your_webhook_secret
```

## API Endpoints

Base: `/api/v1`

- `GET /status` - Health check with DB info
- `POST /auth/login` - Login with credentials
- `POST /auth/logout` - Clear session
- `GET /auth/user` - Current user info
- `GET /cargas` - List cargas (supports pagination, sorting)
- `POST /cargas/check` - Manually trigger cargo check (requires admin key)
- `POST /cargas/webhook` - External cron trigger (requires cron secret)
- `GET /cargas/health` - Operational health status
- `GET|POST /migrations` - View/apply migrations (requires admin key)

## Important Patterns

1. **Lazy env var reading**: Environment variables are read inside functions, not at module level, to allow tests to set vars before importing modules.

2. **Retry logic**: External HTTP calls use `async-retry` with 5 attempts. Disabled when `NODE_ENV=test`.

3. **Structured logging**: Uses `apps/api/src/lib/logger.ts` with JSON output and sensitive data redaction.

4. **Workspace imports**: Use `@notifica/shared` for shared package imports.

5. **Test utilities**: Mock utilities in `tests/test-utils.ts` for type-safe mocking.

## File References

- API entry: `apps/api/src/index.ts`
- App factory: `apps/api/src/app.ts`
- Shared models: `packages/shared/src/models/Carga.ts`
- Tegma scraper: `apps/api/src/services/tegma-scraper.ts`
- Cargo processor: `apps/api/src/services/cargo-processor.ts`
- Database: `apps/api/src/infra/database.ts`
