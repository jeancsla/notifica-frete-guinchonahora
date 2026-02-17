# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js application that monitors the Tegma/Mills transportation website for available cargo loads and sends WhatsApp notifications when new cargas are found. This is a migration from an n8n workflow to a custom Node.js implementation.

- **Node Version:** 24.11.1 (see `.nvmrc`)
- **Framework:** Next.js 16 with Pages Router
- **Database:** PostgreSQL with `pg` driver
- **Architecture:** Layered with Repository Pattern

## Common Commands

**Development:**
```bash
npm run dev              # Start dev server (starts DB, runs migrations)
npm run services:up      # Start PostgreSQL Docker container
npm run services:down    # Stop and remove Docker container
```

**Testing:**
```bash
npm test                 # Run all integration tests (starts services automatically)
npm run test:watch       # Run tests in watch mode
```

Tests are integration-only (62 tests total). External HTTP calls are mocked; database calls are real.

**Linting/Formatting:**
```bash
npm run lint             # Run ESLint
npm run lint:prettier:check   # Check Prettier formatting
npm run lint:prettier:fix     # Fix Prettier formatting
```

**Database:**
```bash
npm run migration:create <name>   # Create new migration file
npm run migration:up              # Run pending migrations
npm run migration:down            # Rollback last migration
```

**Commits:**
```bash
npm run commit           # Use Commitizen for conventional commits
```

## Architecture

### Layered Structure

The codebase follows a layered architecture:

- **`models/`** - Domain entities (e.g., `Carga` class with validation/formatting)
- **`repositories/`** - Database access layer (SQL queries using `pg`)
- **`services/`** - Business logic and external integrations
- **`pages/api/`** - Next.js API routes (HTTP interface)
- **`infra/`** - Infrastructure (database connection, migrations, cron jobs)

### Key Services

**Tegma Scraper (`services/tegma-scraper.js`):**
- Scrapes `gestaotegmatransporte.ventunolog.com.br`
- Flow: get cookie → login → fetch cargas page → parse HTML with Cheerio
- All HTTP calls have 5 retries with exponential backoff (disabled in test mode)

**WhatsApp Notifier (`services/whatsapp-notifier.js`):**
- Integrates with Evolution API (instance: `guincho2`)
- Sends notifications to Jean and Jefferson when new cargas are found

**Cargo Processor (`services/cargo-processor.js`):**
- Orchestrates the workflow: fetch → deduplicate → save → notify
- Called by cron job and API endpoint

### Scheduled Jobs

Cron job defined in `infra/cron-jobs.js`:
- Schedule: `*/15 7-18 * * *` (every 15 minutes, 7AM-6PM)
- Prevents overlapping executions with `isRunning` flag

### Database

- Uses `node-pg-migrate` for migrations
- Key table: `cargas` with UNIQUE constraint on `id_viagem` for deduplication
- Connection module: `infra/database.js`

## Environment Variables

Required in `.env.development`:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=local_user
POSTGRES_DB=local_db
POSTGRES_PASSWORD=localpassword
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POST_DIR/$POSTGRES_DB

# Tegma/Mills (for scraping)
TEGMA_BASE_URL=https://gestaotegmatransporte.ventunolog.com.br
TEGMA_USERNAME=2621
TEGMA_PASSWORD=12345

# Evolution API (for WhatsApp)
EVOLUTION_API_BASE_URL=
EVOLUTION_API_INSTANCE=guincho2
EVOLUTION_API_KEY=

# Notification recipients
NOTIFY_JEAN_PHONE=5512982301778
NOTIFY_JEFFERSON_PHONE=5512996347190
NOTIFY_SEBASTIAO_PHONE=5512996558925
```

## Testing Approach

- **Framework:** Jest with Next.js integration preset
- **Pattern:** Integration tests only; no unit tests
- **External calls:** Mocked via `fetch` mocking
- **Database:** Real database calls; cleaned before/after each test
- **Timeout:** 60 seconds (set in `jest.config.js`)

## API Endpoints

- `GET /api/v1/status` - Health check with DB info
- `GET /api/v1/cargas` - List cargas (supports `limit`, `offset`, `notified` query params)
- `POST /api/v1/cargas/check` - Manually trigger cargo check
- `GET /api/v1/migrations` - Get pending migrations
- `POST /api/v1/migrations` - Run pending migrations

## Important Patterns

1. **Environment variables are read lazily** (inside functions, not at module level) to allow tests to set vars before importing modules.

2. **Retry logic:** External HTTP calls use `async-retry` with 5 attempts. Disabled when `NODE_ENV=test`.

3. **Module system:** ES Modules (`import`/`export`) with `.js` extensions required.

4. **Git hooks:** Husky runs secretlint on staged files and commitlint on commit messages.

5. **Conventional commits:** Use `npm run commit` for commit message formatting.

## File References

- Full implementation details: `docs/IMPLEMENTATION_REPORT.md`
- Original n8n workflow docs: `docs/notificacao-mills-workflow.md`
