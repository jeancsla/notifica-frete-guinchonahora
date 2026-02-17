# Implementation Report: Notificação Mills

**Date:** 2026-02-16
**Project:** Replication of n8n workflow "Notificação Mills" into Next.js codebase
**Approach:** Test-Driven Development (TDD)

---

## Overview

This document describes the complete implementation of the "Notificação Mills" workflow, which monitors the Tegma/Mills transportation website for available cargo loads and sends WhatsApp notifications when new cargas are found.

### Original n8n Workflow Behavior

The original n8n workflow (ID: htdvLvUG4y671QJm) performed the following:

1. **Schedule:** Runs every 15 minutes between 7:00-18:00 (cron: `*/15 7-18 * * *`)
2. **Get Cookie:** Fetches initial session cookie from login page
3. **Login:** Authenticates with fixed credentials (user: YOUR_USERNAME, password: YOUR_PASSWORD)
4. **Fetch Cargas:** Retrieves the "Cargas Disponíveis" page
5. **Parse HTML:** Extracts cargo data from the table using Cheerio
6. **Deduplication:** Removes cargas already processed
7. **Notifications:** Sends WhatsApp messages via Evolution API to Jean and Jefferson
8. **Storage:** Saves cargas to DataTable for historical record

---

## Implementation Details

### 1. Dependencies Added

**package.json additions:**
```json
{
  "dependencies": {
    "cheerio": "^1.0.0",
    "node-cron": "^3.0.3"
  }
}
```

- `cheerio`: Server-side HTML parsing (jQuery-like syntax)
- `node-cron`: Scheduled task execution

### 2. Database Schema

**Migration File:** `infra/migrations/1771215067202_create-cargas-table.js`

```sql
CREATE TABLE cargas (
  id SERIAL PRIMARY KEY,
  id_viagem VARCHAR(50) UNIQUE NOT NULL,
  tipo_transporte VARCHAR(100),
  origem VARCHAR(255),
  destino VARCHAR(255),
  produto VARCHAR(255),
  equipamento VARCHAR(100),
  prev_coleta VARCHAR(50),
  qtd_entregas VARCHAR(10),
  vr_frete VARCHAR(50),
  termino VARCHAR(50),
  notificado_em TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Design Decisions:**
- `id_viagem` is UNIQUE to prevent duplicate notifications
- `notificado_em` tracks when WhatsApp messages were sent
- All fields use VARCHAR with generous sizes for scraped text

### 3. Domain Model

**File:** `models/carga.js`

```javascript
class Carga {
  constructor({ id_viagem, tipoTransporte, origem, destino, produto,
                equipamento, prevColeta, qtdeEntregas, vrFrete, termino })

  isValid()           // Validates id_viagem exists
  toWhatsAppMessage() // Formats message for notifications
  toDatabase()        // Converts to snake_case for DB
  static fromScrapedData(data)  // Factory from scraper output
}
```

### 4. Repository Layer

**File:** `repositories/cargas-repository.js`

Methods implemented:
- `exists(id_viagem)` - Check if cargo was already processed
- `save(carga)` - Insert new cargo
- `markAsNotified(id_viagem)` - Update notification timestamp
- `findAll({ limit, offset })` - List cargas with pagination
- `findNotNotified()` - Get cargas without notifications
- `count()` - Total cargas count

### 5. Services

#### 5.1 Tegma Scraper

**File:** `services/tegma-scraper.js`

**Flow:**
1. `getCookie()` - GET /Login, extract `ASP.NET_SessionId` from set-cookie header
2. `login(cookie)` - POST credentials to /Login with session cookie
3. `fetchCargasPage(cookie)` - GET /Monitoramento/CargasDisponiveis?tpoeqp=0
4. `parseCargas(html)` - Use Cheerio to extract table data

**Retry Logic:**
- 5 retries with exponential backoff (5s-30s)
- Disabled in test mode (`NODE_ENV=test`)

**Environment Variables:**
See `.env.example` file for required environment variables.

#### 5.2 WhatsApp Notifier

**File:** `services/whatsapp-notifier.js`

**Integration:** Evolution API (guincho2 instance)

**Methods:**
- `sendNotification(phone, carga)` - Core API call
- `notifyJean(carga)` - Send to Jean
- `notifyJefferson(carga)` - Send to Jefferson
- `notifySebastiao(carga)` - Send to Sebastiao (disabled by default)

**Message Format:**
```
Da uma olhada no site da Mills:
De: {origem}
Para: {destino}
Produto: {produto}
Veiculo: {equipamento}
Previsao de Coleta: {prevColeta}
https://gestaotegmatransporte.ventunolog.com.br/Login
```

**Environment Variables:**
See `.env.example` file for required environment variables.

#### 5.3 Cargo Processor

**File:** `services/cargo-processor.js`

**Orchestration Flow:**
1. Fetch cargas from Tegma scraper
2. Filter out existing cargas (check `exists()` in repository)
3. For each new cargo:
   - Save to database
   - Send WhatsApp to Jean
   - Send WhatsApp to Jefferson
   - Mark as notified
4. Return summary `{ processed, new_cargas }`

### 6. API Endpoints

#### GET /api/v1/cargas

Returns list of cargas with pagination.

**Query Parameters:**
- `limit` - Number of results (default: 10, max: 100)
- `offset` - Pagination offset (default: 0)
- `notified` - Filter: `false` for not-yet-notified cargas

**Response:**
```json
{
  "cargas": [...],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

#### POST /api/v1/cargas/check

Manually triggers cargo check and notification process.

**Response:**
```json
{
  "processed": 2,
  "new_cargas": [
    { "id_viagem": "12345", "origem": "Sao Paulo - SP", ... }
  ]
}
```

### 7. Scheduled Jobs

**File:** `infra/cron-jobs.js`

```javascript
cron.schedule("*/15 7-18 * * *", async () => {
  // Runs every 15 minutes from 7:00 to 18:00
  const result = await cargoProcessor.process();
});
```

Features:
- Prevents overlapping executions (isRunning flag)
- Logs to console for monitoring

### 8. Tests

All tests follow TDD approach - written before implementation.

#### Test Files Created:

| File | Description | Tests |
|------|-------------|-------|
| `tests/integration/models/carga.test.js` | Carga model validation and formatting | 10 |
| `tests/integration/repositories/cargas-repository.test.js` | Database operations | 11 |
| `tests/integration/services/tegma-scraper.test.js` | Scraping and parsing | 12 |
| `tests/integration/services/whatsapp-notifier.test.js` | WhatsApp notifications | 11 |
| `tests/integration/services/cargo-processor.test.js` | Workflow orchestration | 8 |
| `tests/integration/api/v1/cargas/get.test.js` | API listing endpoint | 6 |
| `tests/integration/api/v1/cargas/post.test.js` | API trigger endpoint | 4 |

**Total: 62 tests**

#### Test Setup Features:
- Mocked `fetch()` for external HTTP calls
- Database cleanup before/after tests
- Environment variable management
- Retry logic disabled in test mode

### 9. Environment Variables Summary

Create `.env.development` based on `.env.example`:

```bash
cp .env.example .env.development
```

Then edit `.env.development` with your actual credentials.

---

## File Structure

```
models/
  carga.js

repositories/
  cargas-repository.js

services/
  tegma-scraper.js
  whatsapp-notifier.js
  cargo-processor.js

pages/api/v1/cargas/
  index.js
  check.js

infra/
  cron-jobs.js
  migrations/1771215067202_create-cargas-table.js

tests/integration/
  models/carga.test.js
  repositories/cargas-repository.test.js
  services/
    tegma-scraper.test.js
    whatsapp-notifier.test.js
    cargo-processor.test.js
  api/v1/cargas/
    get.test.js
    post.test.js
```

---

## Usage

### Run Tests
```bash
npm test
```

### Manual Trigger
```bash
curl -X POST http://localhost:3000/api/v1/cargas/check
```

### List Cargas
```bash
# All cargas
curl http://localhost:3000/api/v1/cargas

# With pagination
curl "http://localhost:3000/api/v1/cargas?limit=5&offset=10"

# Only not notified
curl "http://localhost:3000/api/v1/cargas?notified=false"
```

### Database Operations
```bash
# Run migrations
npm run migration:up

# Check cargas table
psql -d local_db -c "SELECT * FROM cargas;"
```

---

## Key Design Decisions

1. **Fetch vs Axios:** Used native Node.js `fetch()` to match existing codebase patterns

2. **Retry Behavior:**
   - Production: 5 retries with exponential backoff (5s-30s)
   - Tests: Retry disabled to prevent timeouts

3. **Deduplication:** Database-level UNIQUE constraint on `id_viagem`

4. **Environment Variables:**
   - Read lazily (functions) not eagerly (module level)
   - Allows tests to set vars before importing modules

5. **Error Handling:**
   - Service-level errors bubble up to API layer
   - API returns 500 with error message
   - Console logging for debugging

6. **Test Isolation:**
   - Each test cleans database
   - Mocks reset between tests
   - Independent test execution

---

## Known Limitations

1. **Sebastiao notifications:** Disabled in original n8n workflow, implemented but not called
2. **Single cargo per notification:** Original sends one WhatsApp per cargo (not batched)
3. **No webhook support:** Manual trigger only via API/cron
4. **No UI:** API-only, no frontend interface

---

## Future Enhancements

Potential improvements:

1. Add webhook endpoint for real-time notifications
2. Implement batch notification (single message with multiple cargas)
3. Add web UI for viewing cargas and managing settings
4. Support for multiple transportadoras (not just Mills)
5. Add cargo filtering (by origin, destination, equipment type)
6. Store cargo processing logs for audit trail
7. Implement notification rate limiting
8. Add cargo expiration (auto-delete old records)

---

## Verification

All tests pass:
```
PASS tests/integration/services/tegma-scraper.test.js (12 tests)
PASS tests/integration/services/whatsapp-notifier.test.js (11 tests)
PASS tests/integration/services/cargo-processor.test.js (8 tests)
PASS tests/integration/models/carga.test.js (10 tests)
PASS tests/integration/repositories/cargas-repository.test.js (11 tests)
PASS tests/integration/api/v1/cargas/get.test.js (6 tests)
PASS tests/integration/api/v1/cargas/post.test.js (4 tests)
```

**Total: 62 tests passing**

---

## References

- Original n8n workflow: `docs/notificacao-mills-workflow.md`
- n8n workflow ID: `htdvLvUG4y671QJm`
- Target website: https://gestaotegmatransporte.ventunolog.com.br
