# Notifica Frete - Guincho na Hora

Aplicacao para monitorar cargas no portal Tegma/Mills, persistir no Postgres e notificar automaticamente via WhatsApp (Evolution API), com dashboard web protegido por login.

## Stack

- Bun (runtime, package manager, test runner)
- Next.js + React (dashboard web)
- Elysia (API)
- PostgreSQL + node-pg-migrate (persistencia e migracoes)
- node-cron (agendamento)

## Architecture

- `pages/*` e `components/*`: frontend/dashboard.
- `apps/api/src/*`: API Bun com controllers, services, repositorio e cron.
- `app/api/v1/[...all]/route.ts`: modo mono deploy (Next serve `/api/v1/*` localmente).
- `infra/migrations/*`: schema e hardening de banco.
- `packages/shared/*`: tipos e modelo compartilhados entre web e API.

## Quick Start (Local)

### 1) Pre-requisitos

- Bun `>= 1.3.9`
- Docker (recomendado para Postgres local)

### 2) Instale dependencias

```bash
bun install
```

### 3) Configure ambiente

```bash
cp .env.example .env.development
```

Ajuste pelo menos:

- `POSTGRES_*` e `DATABASE_URL`
- `ADMIN_API_KEY`
- `ADMIN_USERNAME` e `ADMIN_PASSWORD`
- `SESSION_SECRET` (minimo 32 caracteres)
- Credenciais Tegma: `TEGMA_USERNAME`, `TEGMA_PASSWORD`
- Credenciais Evolution API: `EVOLUTION_API_*`
- Telefones de notificacao: `NOTIFY_*_PHONE`

### 4) Suba a stack de desenvolvimento

```bash
bun run dev
```

Esse comando:

- faz preflight de portas
- sobe Postgres via Docker Compose
- aguarda banco e aplica migracoes
- sobe Next.js (`:3000`) e Bun API (`:4000`)

### 5) Acesse

- Web: `http://localhost:3000`
- Login: use `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- API status: `http://localhost:3000/api/v1/status`

## Comandos Principais

- `bun run dev`: web + API + migrations + services
- `bun run dev:web`: apenas web (com proxy/mono API)
- `bun run dev:stop`: encerra processos de dev
- `bun run services:up`: sobe Postgres local
- `bun run services:stop`: para Postgres
- `bun run services:down`: remove stack Docker local
- `bun run migration:up`: aplica migracoes
- `bun run migration:down`: rollback ultima migration
- `bun run lint`: ESLint + Prettier check
- `bun run test`: executa suite completa
- `bun run cron`: executa worker cron standalone

## Testes

- `bun run test:api`: testes da API Bun (`apps/api`)
- `bun run test:web`: testes web (unit, ui, integracao)
- `bun run test:unit`: `tests/unit`
- `bun run test:ui`: `tests/ui`
- `bun run test:integration:all`: `tests/integration`

## API v1 (Resumo)

Prefixo: `/api/v1`

- `GET /status`: health/status (detalhes variam por ambiente/permissao)
- `POST /auth/login`: login por credenciais admin
- `POST /auth/logout`: encerra sessao
- `GET /auth/user`: usuario autenticado atual
- `GET /cargas`: lista cargas (requer sessao)
- `POST /cargas/check`: dispara processamento manual (requer `x-admin-key` **ou** `x-cron-secret`)
- `POST /cargas/webhook`: endpoint para scheduler externo (requer `x-cron-secret`, `x-cron-timestamp`, `x-cron-id`)
- `GET /cargas/health`: saude operacional de cargas (requer sessao **ou** `x-admin-key`)
- `GET|POST /migrations`: dry-run/aplicacao de migrations (requer `x-admin-key`)

## Cron / Scheduler

Opcoes suportadas:

- Cron interno: `bun run cron` (agenda `*/15 7-18 * * *`, timezone `America/Sao_Paulo`)
- Webhook externo (ex.: n8n): `POST /api/v1/cargas/webhook`

Detalhes completos: `docs/CRON_OPTIONS.md`.

## Deploy Modes

### Mono deploy (recomendado para simplicidade)

- Next.js e API no mesmo projeto.
- Deixe `API_ORIGIN` vazio.
- `/api/v1/*` eh atendido internamente por `app/api/v1/[...all]/route.ts`.

### API separada

- Deploy da API Bun separado (ex.: `apps/api`).
- Configure `API_ORIGIN=https://sua-api.externa` no web.
- Next aplica rewrite de `/api/v1/*` para origem externa.

## Seguranca

Implementacoes principais:

- Sessao assinada com HMAC (`cargo_session`, `httpOnly`, `sameSite=Lax`, `secure` em producao)
- Comparacao em tempo constante para segredos (`ADMIN_API_KEY`, `CRON_WEBHOOK_SECRET`)
- Rate limiting em login
- RLS e hardening no Postgres via migrations
- Headers de seguranca HTTP (CSP, HSTS em producao, etc.)

Relatorios:

- `docs/SECURITY_IMPLEMENTATION_REPORT.md`
- `docs/SECURITY_HARDENING_AND_LOGGING_REPORT.md`

## Estrutura do Repositorio

```text
.
|-- app/                    # API route handlers do Next (App Router)
|-- apps/api/               # API Bun (Elysia)
|-- components/             # Componentes React reutilizaveis
|-- docs/                   # Documentacao tecnica
|-- infra/                  # Docker, DB, migrations e scripts de infra
|-- packages/shared/        # Tipos/modelos compartilhados
|-- pages/                  # Paginas Next.js (dashboard/login etc.)
|-- services/               # Servicos de integracao (scraper/notifier)
`-- tests/                  # Suites unit/ui/integration
```

## Observacoes

- Nunca versione `.env*` com segredos reais.
- Em producao, configure `SESSION_SECRET` forte e desative defaults inseguros.
- Para migracoes em producao via endpoint, habilite explicitamente `ALLOW_PRODUCTION_MIGRATIONS=true`.

## License

MIT
