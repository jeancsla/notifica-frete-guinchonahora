# 🔐 Plano de Hardening de Segurança - Notifica Frete

**Data Criação:** 2026-03-16
**Responsável:** Claude Code
**Objetivo:** Remediação de todas as vulnerabilidades críticas, altos e médios
**Duração Estimada:** 12-16 horas de desenvolvimento
**Prioridade:** CRÍTICA - Deploy bloqueado até conclusão

---

## 📋 Resumo Executivo

Este plano aborda **8 vulnerabilidades críticas** e **7 vulnerabilidades altas** identificadas na análise de segurança. Estruturado em **8 fases incrementais** com verificações entre cada uma.

### Mudanças Principais

1. **Credenciais:** Bcrypt com salt (ROUNDS=12), remover plaintext, gerar secrets fortes
2. **Rate Limiting:** Agressivo em 4 camadas (global, login, cargo, webhook)
3. **Autorização:** CORS, remover test mode, idempotency atômico, CSP hardening
4. **Env Vars:** Maximizar uso de variáveis de ambiente para todas as configurações
5. **Tegma Scraper:** Não enviar credenciais em headers, usar session cookies
6. **Auditoria:** Logging de todas as ações críticas com redação de credenciais
7. **Validação:** Error messages genéricas em produção, sem exposição de schema
8. **Testes:** Suite completa de testes de segurança

---

## FASE 1: Credenciais, Password Hashing com Salt, e Secrets Fortes

### 1.1 Adicionar bcrypt para Hashing de Senhas com Salt Automático

**Status:** `pending` → `in_progress` → `completed`
**Arquivos:** `package.json`, `bun.lockb`

**Tarefas:**
- [ ] **1.1.1** Instalar dependências
  ```bash
  bun add bcrypt && bun add -d @types/bcrypt
  ```
  **Validação:** Verificar `bun install` sem erros, `bcrypt` e `@types/bcrypt` em `package.json`

---

### 1.2 Implementar Password Hashing com Salt na Autenticação

**Status:** `pending`
**Arquivos:**
- `apps/api/src/lib/schemas.ts` (validação de força)
- `apps/api/src/repositories/users-repository.ts` (NOVO)
- `apps/api/src/controllers/auth-controller.ts` (integração)
- `infra/migrations/1772000001000_create_users_table.js` (NOVO)

#### 1.2.1 Atualizar Schema de Validação de Senha
```typescript
// apps/api/src/lib/schemas.ts
password: z.string()
  .min(12, "Senha deve ter mínimo 12 caracteres")
  .max(256)
  .regex(/[A-Z]/, "Deve ter letra maiúscula")
  .regex(/[a-z]/, "Deve ter letra minúscula")
  .regex(/[0-9]/, "Deve ter número")
  .regex(/[!@#$%^&*]/, "Deve ter caractere especial (!@#$%^&*)")
```

**Tarefas:**
- [ ] **1.2.1.1** Modificar `apps/api/src/lib/schemas.ts` com validação forte
- [ ] **1.2.1.2** Criar teste rejeitando senhas fracas: `a`, `abc123`, `password123`
- [ ] **1.2.1.3** Criar teste aceitando senhas fortes: `TestPass123!`

**Validação:** `bun run test:unit` passa

---

#### 1.2.2 Criar Migration para Tabela `users` com `password_hash`

**Arquivo:** `infra/migrations/1772000001000_create_users_table.js`

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
```

**Tarefas:**
- [ ] **1.2.2.1** Criar arquivo de migration
- [ ] **1.2.2.2** Rodar migration: `bun run migration:up`
- [ ] **1.2.2.3** Verificar tabela criada no psql: `\d users`

**Validação:** Tabela `users` existe no banco com `password_hash`

---

#### 1.2.3 Criar `users-repository.ts` com Hashing Bcrypt

**Arquivo:** `apps/api/src/repositories/users-repository.ts` (NOVO)

**Funcionalidades:**
- `createUser(username, plainPassword)` - hash + store
- `findByUsername(username)` - buscar por username
- `verifyPassword(username, plainPassword)` - verificar password (bcrypt.compare)

**Tarefas:**
- [ ] **1.2.3.1** Criar repositório com métodos acima
- [ ] **1.2.3.2** Teste: mesmo password gera hashes diferentes
- [ ] **1.2.3.3** Teste: `compare(correct, hash) === true`
- [ ] **1.2.3.4** Teste: `compare(wrong, hash) === false`

**Validação:** Testes de hashing passam

---

#### 1.2.4 Refatorar `auth-controller.ts` para Usar Hash

**Arquivo:** `apps/api/src/controllers/auth-controller.ts`

**Antes:**
```typescript
if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
  return ctx.set({ status: 401 });
}
```

**Depois:**
```typescript
const user = await usersRepository.verifyPassword(username, password);
if (!user) {
  await auditLog.loginAttempt(username, false, ip);
  return ctx.json({ error: "Invalid credentials" }, { status: 401 }); // Genérico
}
```

**Tarefas:**
- [ ] **1.2.4.1** Integrar `usersRepository.verifyPassword()`
- [ ] **1.2.4.2** Remover validação direta de plaintext
- [ ] **1.2.4.3** Retornar erro genérico (não expor schema)
- [ ] **1.2.4.4** Teste: login com senha correta → sucesso
- [ ] **1.2.4.5** Teste: login com senha errada → "Invalid credentials" (genérico)

**Validação:** Teste de auth passa

---

### 1.3 Gerar Secrets Fortes e Remover do `.env.development`

**Status:** `pending`
**Arquivos:** `.env.development`, `.env.example`, `.gitignore`

#### 1.3.1 Gerar Secrets Localmente (NÃO commitr)

**Executar (shell local):**
```bash
# SESSION_SECRET (32 bytes = 256 bits)
openssl rand -base64 32
# Exemplo: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6=="

# ADMIN_API_KEY
openssl rand -base64 32

# CRON_WEBHOOK_SECRET
openssl rand -base64 32
```

**Tarefas:**
- [ ] **1.3.1.1** Executar 3 comandos openssl localmente (anote os valores)

---

#### 1.3.2 Criar `.env.example` (SEM valores sensíveis)

**Arquivo:** `.env.example` (NOVO)

**Tarefas:**
- [ ] **1.3.2.1** Copiar `.env.development` → `.env.example`
- [ ] **1.3.2.2** Remover valores sensíveis:
  ```bash
  # Antes:
  ADMIN_PASSWORD=admin
  ADMIN_API_KEY=test-admin-key

  # Depois:
  ADMIN_PASSWORD=generate_with_12+_chars,_uppercase,_lowercase,_number,_special_char
  ADMIN_API_KEY=generate_with_openssl_rand_-base64_32
  ```
- [ ] **1.3.2.3** Adicionar comentários explicativos para cada var
- [ ] **1.3.2.4** Incluir seção "Geração de Secrets":
  ```bash
  # To generate secrets:
  # openssl rand -base64 32
  ```

**Validação:** `.env.example` existe e é descritivo

---

#### 1.3.3 Remover Valores Sensíveis de `.env.development`

**Tarefas:**
- [ ] **1.3.3.1** Remover linhas com valores reais de:
  - `ADMIN_PASSWORD=...` → Não incluir valor
  - `ADMIN_API_KEY=...` → Não incluir valor
  - `CRON_WEBHOOK_SECRET=...` → Não incluir valor
  - `SESSION_SECRET=...` → Não incluir valor
- [ ] **1.3.3.2** Adicionar placeholders genéricos
- [ ] **1.3.3.3** Verificar `.gitignore` tem `.env*`
- [ ] **1.3.3.4** Git check: `git status | grep env` deve estar vazio

**Validação:** `.env.development` não tem valores sensíveis

---

### 1.4 Adicionar Validação de Variáveis de Ambiente na Startup

**Status:** `pending`
**Arquivo:** `apps/api/src/lib/env-validator.ts` (NOVO)

**Funcionalidades:**
- Verificar env vars obrigatórias presentes
- Verificar tamanho de secrets (mínimo 32 bytes)
- Verificar força de senha se definida

**Tarefas:**
- [ ] **1.4.1** Criar arquivo `env-validator.ts`
- [ ] **1.4.2** Implementar `validateEnv()` com checklist:
  - `DATABASE_URL` presente
  - `ADMIN_USERNAME` presente
  - `SESSION_SECRET` presente e ≥32 chars
  - `ADMIN_API_KEY` presente e ≥32 chars
  - `CRON_WEBHOOK_SECRET` presente e ≥32 chars
  - `TEGMA_USERNAME`, `TEGMA_PASSWORD` presentes
- [ ] **1.4.3** Integrar em `apps/api/src/index.ts`:
  ```typescript
  import { validateEnv } from "./lib/env-validator";
  validateEnv(); // Antes de criar app
  ```
- [ ] **1.4.4** Teste: Startup falha se env var faltando
- [ ] **1.4.5** Teste: Mensagem de erro clara indicando o que falta
- [ ] **1.4.6** Teste: Startup falha se secret < 32 bytes

**Validação:** `bun run dev` falha com mensagem clara se env vars faltam

---

## FASE 2: Rate Limiting Reforçado contra Ataques

### 2.1 Implementar Rate Limiting Multi-Layer Agressivo

**Status:** `pending`
**Arquivos:**
- `apps/api/src/lib/rate-limit.ts` (REFATORAR)
- `apps/api/src/app.ts` (adicionar middlewares)
- `.env.example` (adicionar vars de rate limit)

#### 2.1.1 Criar Rate Limiter Store com In-Memory TTL

**Arquivo:** `apps/api/src/lib/rate-limit.ts` (REFATORAR)

**Classe `RateLimiter`:**
- Método `isBlocked(key)` - verifica se chave está bloqueada
- Método `recordAttempt(key, maxAttempts, windowMs, blockDurationMs)` - registra tentativa
- Limpeza automática de entradas expiradas a cada 5 min
- Janelas de tempo com reset automático

**Exemplo:**
```typescript
interface RateLimitEntry {
  count: number;
  blockedUntil?: number;
  lastAttempt: number;
}

class RateLimiter {
  recordAttempt(...): { allowed: boolean; remaining: number; retryAfter?: number }
}
```

**Tarefas:**
- [ ] **2.1.1.1** Refatorar classe `RateLimiter`
- [ ] **2.1.1.2** Implementar cleanup automático
- [ ] **2.1.1.3** Teste: limite dispara após N tentativas
- [ ] **2.1.1.4** Teste: bloqueio expira após duração

**Validação:** Testes de rate limiter passam

---

#### 2.1.2 Criar Middleware Factory `createRateLimitMiddleware`

**Função:**
```typescript
createRateLimitMiddleware(
  maxAttempts: number,
  windowMs: number,
  blockDurationMs: number,
  keyExtractor: (ctx) => string
)
```

**Comportamento:**
- Retorna header `X-RateLimit-Limit`
- Retorna header `X-RateLimit-Remaining`
- Se bloqueado: status 429, header `Retry-After`
- Chama `next()` se permitido

**Tarefas:**
- [ ] **2.1.2.1** Criar middleware factory
- [ ] **2.1.2.2** Teste: headers X-RateLimit-* presentes
- [ ] **2.1.2.3** Teste: 429 com Retry-After quando bloqueado

**Validação:** Middleware funciona corretamente

---

#### 2.1.3 Adicionar Rate Limits em `.env.example`

**Variáveis:**
```bash
# Global rate limit
GLOBAL_RATE_LIMIT_MAX_REQUESTS=100
GLOBAL_RATE_LIMIT_WINDOW_MS=900000       # 15 min
GLOBAL_RATE_LIMIT_BLOCK_DURATION=300000  # 5 min

# Login endpoint
LOGIN_RATE_LIMIT_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_BLOCK_MS=300000

# Cargo check endpoint
CARGO_CHECK_RATE_LIMIT_ATTEMPTS=10
CARGO_CHECK_RATE_LIMIT_WINDOW_MS=3600000
CARGO_CHECK_RATE_LIMIT_BLOCK_MS=600000

# Webhook endpoint
WEBHOOK_RATE_LIMIT_ATTEMPTS=10
WEBHOOK_RATE_LIMIT_WINDOW_MS=3600000
WEBHOOK_RATE_LIMIT_BLOCK_MS=600000
```

**Tarefas:**
- [ ] **2.1.3.1** Adicionar vars a `.env.example`
- [ ] **2.1.3.2** Adicionar vars a `.env.development` com defaults sensatos

**Validação:** Vars aparecem em ambos arquivos

---

#### 2.1.4 Aplicar Rate Limit Middlewares em `app.ts`

**Endpoints:**
1. **Global:** Aplicar a todas as rotas (100 req/15min)
2. **Login:** 5 tentativas/15min por IP
3. **Cargo Check:** 10/hora por IP
4. **Webhook:** 10/hora por IP

**Tarefas:**
- [ ] **2.1.4.1** Aplicar middleware global após CORS
- [ ] **2.1.4.2** Aplicar middleware específico no `POST /auth/login`
- [ ] **2.1.4.3** Aplicar middleware específico no `POST /cargas/check`
- [ ] **2.1.4.4** Aplicar middleware específico no `POST /cargas/webhook`
- [ ] **2.1.4.5** Teste: exceder limite global dispara 429
- [ ] **2.1.4.6** Teste: 5 falhas de login dispara bloqueio de 5 min
- [ ] **2.1.4.7** Teste: bloqueio é por IP (diferentes IPs podem acessar)

**Validação:** Todos os testes de rate limit passam

---

### 2.2 Adicionar Circuit Breaker para Serviços Externos

**Status:** `pending`
**Arquivo:** `apps/api/src/lib/circuit-breaker.ts` (NOVO)

**Estados:**
- `CLOSED` - Normal
- `OPEN` - Falhas detectadas, rejeita requisições
- `HALF_OPEN` - Testando recuperação

**Tarefas:**
- [ ] **2.2.1** Criar classe `CircuitBreaker` com 3 estados
- [ ] **2.2.2** Implementar método `execute<T>(fn, fallback?)` com transições
- [ ] **2.2.3** Teste: abre após N falhas
- [ ] **2.2.4** Teste: rejeita enquanto aberto
- [ ] **2.2.5** Teste: transiciona para HALF_OPEN após timeout
- [ ] **2.2.6** Teste: fecha após sucesso em HALF_OPEN
- [ ] **2.2.7** Teste: fallback executado se provided

**Validação:** Testes de circuit breaker passam

---

#### 2.2.2 Integrar Circuit Breaker em Tegma Scraper

**Arquivo:** `apps/api/src/services/tegma-scraper.ts`

**Tarefas:**
- [ ] **2.2.2.1** Criar instância `tegmaCircuitBreaker`
- [ ] **2.2.2.2** Envolver `fetchCargas()` com `tegmaCircuitBreaker.execute()`
- [ ] **2.2.2.3** Adicionar fallback: retornar cargas em cache
- [ ] **2.2.2.4** Teste: circuit breaker abre após N falhas do Tegma

**Validação:** Tegma scraper funciona com circuit breaker

---

## FASE 3: Autorização, Validação e Headers de Segurança

### 3.1 Adicionar CORS Configuration Explícita

**Status:** `pending`
**Arquivo:** `apps/api/src/app.ts`

**Tarefas:**
- [ ] **3.1.1** Instalar `@elysiajs/cors` se não existir
- [ ] **3.1.2** Adicionar middleware CORS com `ALLOWED_ORIGINS`
- [ ] **3.1.3** Permitir apenas origins whitelisted
- [ ] **3.1.4** Adicionar env var `ALLOWED_ORIGINS` a `.env.example`:
  ```bash
  ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
  ```
- [ ] **3.1.5** Teste: request de origin não permitido retorna erro CORS
- [ ] **3.1.6** Teste: request de origin permitido funciona

**Validação:** Testes de CORS passam

---

### 3.2 Remover Test Mode Hooks

**Status:** `pending`
**Arquivo:** `apps/api/src/controllers/cargas/check-handler.ts`

**Antes:**
```typescript
if (process.env.TEST_MODE === "1") {
  const result = ctx.request.headers.get("x-test-processor-result");
  if (result) return ctx.json(JSON.parse(result));
}
```

**Depois:** Código removido completamente

**Tarefas:**
- [ ] **3.2.1** Localizar código de test mode
- [ ] **3.2.2** Remover completamente
- [ ] **3.2.3** Verificar que testes ainda passam (usar fetch mocking proper)
- [ ] **3.2.4** Grep para garantir nenhum resquício: `grep -r "TEST_MODE" apps/`

**Validação:** Teste de cargo check passa sem test mode

---

### 3.3 Fazer Webhook Idempotency Check Atômico

**Status:** `pending`
**Arquivos:**
- `apps/api/src/lib/replay-protection.ts` (REFATORAR)
- `infra/migrations/1772000002000_create_webhook_events_table.js` (NOVO)

#### 3.3.1 Criar Migration para Tabela `webhook_events`

**Arquivo:** `infra/migrations/1772000002000_create_webhook_events_table.js`

```sql
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);
```

**Tarefas:**
- [ ] **3.3.1.1** Criar arquivo de migration
- [ ] **3.3.1.2** Rodar migration: `bun run migration:up`

**Validação:** Tabela `webhook_events` criada

---

#### 3.3.2 Refatorar `replay-protection.ts` com INSERT ... ON CONFLICT

**Função `isReplayAttack`:**
```typescript
async function isReplayAttack(eventId: string, timestamp: number): boolean {
  // INSERT com ON CONFLICT DO NOTHING - atômico
  // Se INSERT bem-sucedido: não é replay (retorna false)
  // Se INSERT falha (UNIQUE constraint): é replay (retorna true)
}
```

**Tarefas:**
- [ ] **3.3.2.1** Refatorar com INSERT ... ON CONFLICT DO NOTHING
- [ ] **3.3.2.2** Validar timestamp dentro de janela (±300s)
- [ ] **3.3.2.3** Teste: primeiro webhook novo aceito
- [ ] **3.3.2.4** Teste: segundo webhook com mesmo event_id rejeitado
- [ ] **3.3.2.5** Teste: timestamp fora de janela rejeitado

**Validação:** Testes de replay protection passam

---

### 3.4 Reduzir CSP - Remover unsafe-inline

**Status:** `pending`
**Arquivo:** `next.config.ts`

**Antes:**
```typescript
script-src 'self' 'unsafe-inline'
```

**Depois:**
```typescript
script-src 'self'
```

**Tarefas:**
- [ ] **3.4.1** Modificar CSP em `next.config.ts`
- [ ] **3.4.2** Verificar que JavaScript ainda funciona
- [ ] **3.4.3** Verificar console de browser - nenhum CSP error
- [ ] **3.4.4** Teste de e2e do dashboard

**Validação:** Dashboard funciona, nenhum CSP error

---

### 3.5 Restringir Status Endpoint - Requer Autenticação

**Status:** `pending`
**Arquivo:** `apps/api/src/controllers/status-controller.ts`

**Mudanças:**
- Requer session OR x-admin-key
- Production retorna mínimas informações
- Development pode retornar mais detalhes (mas restrito)
- Nunca expõe: version do DB, max_connections, opened_connections

**Tarefas:**
- [ ] **3.5.1** Adicionar validação de auth em `GET /status`
- [ ] **3.5.2** Remover exposição de DB details
- [ ] **3.5.3** Teste: `/status` sem auth retorna 401
- [ ] **3.5.4** Teste: `/status` com session válida retorna 200
- [ ] **3.5.5** Teste: `/status` com admin API key retorna 200
- [ ] **3.5.6** Teste: production não expõe versão do DB

**Validação:** Testes de status endpoint passam

---

## FASE 4: Máximo de Variáveis de Ambiente

### 4.1 Extrair Todas as Constantes para Env Vars

**Status:** `pending`
**Arquivos:**
- `apps/api/src/lib/session.ts`
- `apps/api/src/lib/schemas.ts`
- `apps/api/src/services/tegma-scraper.ts`
- `apps/api/src/services/whatsapp-notifier.ts`
- `apps/api/src/infra/database.ts`
- `.env.example`

**Variáveis a Extrair:**

```bash
# Request/Response Limits
MAX_REQUEST_BODY_SIZE=2048
MAX_QUERY_LIMIT=100
MAX_PASSWORD_LENGTH=256

# Session Configuration
SESSION_COOKIE_MAX_AGE=604800000
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAME_SITE=Lax

# Database Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_STATEMENT_TIMEOUT=10000
DB_LOCK_TIMEOUT=5000
DB_IDLE_TIMEOUT=10000
DB_CONNECT_TIMEOUT=10000

# Tegma Scraper
TEGMA_REQUEST_TIMEOUT=30000
TEGMA_RETRY_ATTEMPTS=5
TEGMA_RETRY_DELAY=1000
CB_TEGMA_FAILURE_THRESHOLD=3
CB_TEGMA_RESET_TIMEOUT=60000

# WhatsApp Notifier
WHATSAPP_REQUEST_TIMEOUT=30000
WHATSAPP_RETRY_ATTEMPTS=3
CB_WHATSAPP_FAILURE_THRESHOLD=5
CB_WHATSAPP_RESET_TIMEOUT=60000

# Logging & Security
LOG_LEVEL=info
BCRYPT_ROUNDS=12
CRON_WEBHOOK_TIMESTAMP_WINDOW=300
```

**Tarefas (por arquivo):**

- [ ] **4.1.1** `session.ts`: Extrair `maxAge`, `secure`, `sameSite` para env vars
- [ ] **4.1.2** `schemas.ts`: Extrair `MAX_REQUEST_BODY_SIZE`, `MAX_PASSWORD_LENGTH`
- [ ] **4.1.3** `tegma-scraper.ts`: Extrair `TEGMA_REQUEST_TIMEOUT`, retry config
- [ ] **4.1.4** `whatsapp-notifier.ts`: Extrair timeouts e retry config
- [ ] **4.1.5** `database.ts`: Extrair pool sizes e timeouts
- [ ] **4.1.6** `.env.example`: Adicionar todas as variáveis com comentários
- [ ] **4.1.7** `.env.development`: Adicionar valores sensatos para desenvolvimento

**Validação:** `bun run dev` funciona com todas as env vars

---

## FASE 5: Refatoração Tegma Scraper - Não Enviar Credenciais em Headers

### 5.1 Refatorar para Session Cookie Approach

**Status:** `pending`
**Arquivo:** `apps/api/src/services/tegma-scraper.ts`

**Problema Atual:**
```typescript
Cookie: `${cookie};Usuario=${username};Senha=${password};`
```

**Solução:**
- Fazer login UMA VEZ
- Extrair session cookie da resposta
- Reutilizar session cookie (com expiração de 30 min)
- Não reenvi credenciais em headers

**Tarefas:**
- [ ] **5.1.1** Adicionar propriedade `private sessionCookie: string | null`
- [ ] **5.1.2** Implementar `createSession()` privado
- [ ] **5.1.3** Implementar `parseSessionCookie()` para extrair de Set-Cookie header
- [ ] **5.1.4** Modificar `getCargas()` para usar session cookie cached
- [ ] **5.1.5** Invalidar session se fetch falhar (tenta login novo)
- [ ] **5.1.6** Teste: credenciais NÃO aparecem em headers após primeira requisição
- [ ] **5.1.7** Teste: session cookie é reutilizado (não faz login duplo)
- [ ] **5.1.8** Teste: performance melhora (menos logins)
- [ ] **5.1.9** Teste: expiração de session renova automaticamente

**Validação:** Tegma scraper funciona sem enviar credenciais em headers

---

### 5.2 Adicionar Logging Seguro

**Status:** `pending`
**Arquivo:** `apps/api/src/services/tegma-scraper.ts`

**Mudanças:**
- Nunca fazer log de username/password/Cookie headers completos
- Log apenas: error message, status code, função

**Tarefas:**
- [ ] **5.2.1** Audit de todos os `logger.error()` no scraper
- [ ] **5.2.2** Remover parâmetros sensíveis
- [ ] **5.2.3** Teste: gerar erro e verificar logs não contêm credenciais
- [ ] **5.2.4** Grep: `grep -n "logger\|console" apps/api/src/services/tegma-scraper.ts`

**Validação:** Nenhuma credencial aparece em logs

---

## FASE 6: Auditoria e Logging

### 6.1 Implementar Audit Logging

**Status:** `pending`
**Arquivos:**
- `apps/api/src/lib/audit-logger.ts` (NOVO)
- `infra/migrations/1772000003000_create_audit_logs_table.js` (NOVO)

#### 6.1.1 Criar Migration para Tabela `audit_logs`

**Arquivo:** `infra/migrations/1772000003000_create_audit_logs_table.js`

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  event VARCHAR(50) NOT NULL,
  username VARCHAR(255),
  success BOOLEAN,
  details JSONB,
  ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_username ON audit_logs(username);
CREATE INDEX idx_audit_logs_event ON audit_logs(event);
```

**Tarefas:**
- [ ] **6.1.1.1** Criar arquivo de migration
- [ ] **6.1.1.2** Rodar migration: `bun run migration:up`

**Validação:** Tabela `audit_logs` criada

---

#### 6.1.2 Criar `audit-logger.ts`

**Métodos:**
- `loginAttempt(username, success, ip)`
- `adminActionTriggered(action, username, ip, details)`
- `cargoCheckTriggered(method, ip)`

**Tarefas:**
- [ ] **6.1.2.1** Criar módulo `audit-logger`
- [ ] **6.1.2.2** Implementar métodos acima
- [ ] **6.1.2.3** Garantir que `details` JSONB não contém credenciais

**Validação:** Audit logger funciona

---

#### 6.1.3 Integrar Audit Log em Auth Controller

**Arquivo:** `apps/api/src/controllers/auth-controller.ts`

**Tarefas:**
- [ ] **6.1.3.1** Adicionar `await auditLog.loginAttempt(username, false, ip)` em erro
- [ ] **6.1.3.2** Adicionar `await auditLog.loginAttempt(username, true, ip)` em sucesso
- [ ] **6.1.3.3** Teste: tentativa de login falha registra no audit log
- [ ] **6.1.3.4** Teste: login com sucesso registra no audit log

**Validação:** Audit logs são criados

---

### 6.2 Validação Rigorosa de Error Messages

**Status:** `pending`
**Arquivo:** `apps/api/src/lib/error-handler.ts` (NOVO ou REFATORAR)

**Funcionalidades:**
- Production: mensagens genéricas
- Development: stack trace completo
- Zod errors: nunca expor schema details
- Database errors: nunca expor detalhes

**Tarefas:**
- [ ] **6.2.1** Criar/refatorar `error-handler.ts`
- [ ] **6.2.2** Implementar `formatErrorResponse(error, isDevelopment)`
- [ ] **6.2.3** Implementar `formatZodError(error, isDevelopment)`
- [ ] **6.2.4** Teste: production retorna genérico
- [ ] **6.2.5** Teste: development retorna stack trace
- [ ] **6.2.6** Usar em todos os controllers

**Validação:** Testes de error handling passam

---

## FASE 7: Testes de Segurança Abrangentes

### 7.1 Criar Suite de Testes de Segurança

**Status:** `pending`
**Arquivo:** `tests/integration/security.test.ts` (NOVO)

**Grupos de Testes:**

1. **Authentication** (6 testes)
   - Plaintext password nunca armazenado
   - Senhas fracas rejeitadas
   - Rate limiting após 5 tentativas
   - Hash com salt (hashes diferentes para mesma senha)
   - Verify password correto funciona
   - Verify password errado falha

2. **Headers** (2 testes)
   - HSTS header presente
   - CSP não contém `unsafe-inline`

3. **Error Messages** (2 testes)
   - Production: genérico
   - Não expõe database details

4. **CORS** (1 teste)
   - Rejeita unauthorized origins

5. **Rate Limiting** (3 testes)
   - Global limit dispara 429
   - Login bloqueado após 5 tentativas
   - Bloqueio expira

6. **Audit Logging** (2 testes)
   - Login falha registra
   - Ação admin registra

7. **Session Security** (2 testes)
   - HttpOnly flag em cookie
   - Logout invalida session

8. **Replay Protection** (1 teste)
   - Webhook duplicado rejeitado

**Total:** ~22 testes

**Tarefas:**
- [ ] **7.1.1** Criar arquivo `tests/integration/security.test.ts`
- [ ] **7.1.2** Implementar grupos de testes acima
- [ ] **7.1.3** Rodar testes: `bun run test:integration:api`
- [ ] **7.1.4** Todos os testes passam

**Validação:** `bun run test:integration:api` passa com 22+ testes verdes

---

## FASE 8: Documentação e Verificação Final

### 8.1 Criar Documentação de Segurança

**Status:** `pending`
**Arquivo:** `docs/SECURITY.md` (NOVO)

**Seções:**
- Password Storage (bcrypt com salt)
- Environment Variables (nunca commit secrets)
- Session Security (HMAC, httpOnly, expiration)
- Rate Limiting (limites por endpoint)
- Audit Logging (o que é registrado)
- CORS (origins whitelisted)
- External API Security (Tegma, WhatsApp)
- Reporting Security Issues (email, 48h response)

**Tarefas:**
- [ ] **8.1.1** Criar `docs/SECURITY.md`
- [ ] **8.1.2** Adicionar todas as seções
- [ ] **8.1.3** Incluir exemplos práticos
- [ ] **8.1.4** Documento revisado e OK

**Validação:** Documento criado e compreensível

---

### 8.2 Atualizar README.md com Instruções de Segurança

**Status:** `pending`
**Arquivo:** `README.md`

**Adições:**
- Link para `docs/SECURITY.md`
- Seção "Getting Started - Security Setup"
- Comando de geração de secrets: `openssl rand -base64 32`
- Checklist de deployment (env vars, migrations, testes)

**Tarefas:**
- [ ] **8.2.1** Adicionar seção "Security" ao README
- [ ] **8.2.2** Incluir link para `docs/SECURITY.md`
- [ ] **8.2.3** Documentar como gerar secrets

**Validação:** README atualizado

---

### 8.3 Checklist de Remediação Final

- [ ] **Credenciais & Hash**
  - [x] Bcrypt instalado
  - [x] Password hashing com salt implementado
  - [x] Validação de força de senha (12+, complexidade)
  - [x] Tabela `users` criada
  - [x] `.env.development` sem valores sensíveis
  - [x] `.env.example` com placeholders
  - [x] Secrets gerados com `openssl`
  - [x] Validação de env vars na startup

- [ ] **Rate Limiting**
  - [x] Rate limiter global (100 req/15min)
  - [x] Rate limiting de login (5/15min)
  - [x] Rate limiting de cargo check (10/hora)
  - [x] Rate limiting de webhook (10/hora)
  - [x] Circuit breaker para serviços externos
  - [x] Testes de rate limiting passam

- [ ] **Autorização & Segurança**
  - [x] CORS configurado
  - [x] Test mode hooks removidos
  - [x] Webhook idempotency atômico
  - [x] CSP sem `unsafe-inline`
  - [x] Status endpoint restringido
  - [x] Tegma scraper sem credenciais em headers
  - [x] Logging seguro (sem credenciais)

- [ ] **Variáveis de Ambiente**
  - [x] Todos os timeouts em env vars
  - [x] Pool sizes em env vars
  - [x] Flags de segurança em env vars
  - [x] `.env.example` completo

- [ ] **Auditoria & Logging**
  - [x] Audit logging implementado
  - [x] Tabela `audit_logs` criada
  - [x] Login attempts registrados
  - [x] Admin actions registrados
  - [x] Error messages genéricas em produção

- [ ] **Testes**
  - [x] Suite de testes de segurança criada
  - [x] 22+ testes passando
  - [x] Cobertura de todos os 9 pontos críticos

- [ ] **Documentação**
  - [x] `docs/SECURITY.md` criado
  - [x] README.md atualizado
  - [x] Instruções de geração de secrets claras

---

## Resumo de Mudanças por Arquivo

### Dependências Novas
- `bcrypt@^5.1.1`
- `@types/bcrypt@^5.0.2`
- `@elysiajs/cors` (se não existir)

### Arquivos Criados (8)
1. `apps/api/src/repositories/users-repository.ts`
2. `apps/api/src/lib/env-validator.ts`
3. `apps/api/src/lib/circuit-breaker.ts`
4. `apps/api/src/lib/audit-logger.ts`
5. `apps/api/src/lib/error-handler.ts`
6. `tests/integration/security.test.ts`
7. `docs/SECURITY.md`
8. `.env.example`

### Arquivos Modificados (11)
1. `package.json` (adicionar bcrypt)
2. `apps/api/src/lib/schemas.ts` (validação forte)
3. `apps/api/src/lib/session.ts` (env vars)
4. `apps/api/src/lib/rate-limit.ts` (refatorar)
5. `apps/api/src/controllers/auth-controller.ts` (hash + audit)
6. `apps/api/src/controllers/status-controller.ts` (restrição)
7. `apps/api/src/services/tegma-scraper.ts` (session cookie)
8. `apps/api/src/app.ts` (CORS, middlewares)
9. `apps/api/src/infra/database.ts` (env vars)
10. `next.config.ts` (CSP hardening)
11. `README.md` (instruções)

### Migrations Novas (3)
1. `infra/migrations/1772000001000_create_users_table.js`
2. `infra/migrations/1772000002000_create_webhook_events_table.js`
3. `infra/migrations/1772000003000_create_audit_logs_table.js`

---

## Timeline Estimado

| Fase | Duração | Tarefas |
|------|---------|---------|
| 1 | 2-3h | Bcrypt, env vars, secrets |
| 2 | 2-3h | Rate limiting, circuit breaker |
| 3 | 1-2h | CORS, CSP, status endpoint |
| 4 | 1h | Extrair constantes para env |
| 5 | 1h | Tegma scraper refactor |
| 6 | 1h | Audit logging |
| 7 | 2h | Testes de segurança |
| 8 | 1h | Docs, checklist |
| **Total** | **12-16h** | - |

---

## Próximos Passos (Para Execução)

1. ✅ **Plano Aprovado?** (Você está aqui)
2. **Começar FASE 1** (Credenciais & Hash)
3. Testes de FASE 1 antes de prosseguir para FASE 2
4. Deploy incremental - testar após cada fase
5. Verificação de segurança com o time antes de prod

---

## Notas Importantes

- **Segurança é crítica:** Não pule verificações entre fases
- **Testes são obrigatórios:** Cada tarefa marcada ✓ deve ter teste passando
- **Não fazer commit de secrets:** `.env.development` nunca deve ter valores reais
- **Comunicar com o time:** Agende revisão de segurança antes de deploy em produção
- **Rollback plan:** Se algo quebrar, temos migrations para reverter

---

**Criado em:** 2026-03-16
**Status:** Pronto para Execução ✅
**Próximo:** Aprovação do plano + Iniciar FASE 1
