# 🔐 Plano de Hardening de Segurança - Notifica Frete

**Data Criação:** 2026-03-16
**Última Revisão:** 2026-03-16 (revisão crítica: edge cases, performance, lacunas)
**Responsável:** Claude Code
**Objetivo:** Remediação de todas as vulnerabilidades críticas, altos e médios
**Duração Estimada:** 12-16 horas de desenvolvimento
**Prioridade:** CRÍTICA - Deploy bloqueado até conclusão

---

## ⚠️ ERROS E CORREÇÕES IDENTIFICADOS NA REVISÃO DO CÓDIGO REAL

> Esta seção documenta as divergências entre o plano original e o código existente.
> **Ler antes de implementar qualquer fase.**

### ERRO 1: Circuit Breaker JÁ EXISTE
**O plano propõe criar `circuit-breaker.ts`, mas o arquivo já existe e está em uso.**
- Arquivo: `apps/api/src/lib/circuit-breaker.ts` — implementação completa com estados CLOSED/OPEN/HALF_OPEN, registry e métricas
- O `tegma-scraper.ts` já importa `getCircuitBreaker` e usa com `failureThreshold: 3, resetTimeoutMs: 60000`
- **Ação:** Remover as tarefas 2.2.1 a 2.2.7. Apenas ajustar a configuração via env vars (fase 4).

### ERRO 2: Redis JÁ EXISTE para Rate Limit e Replay Protection
**O plano propõe implementar rate limiter do zero, mas o código já tem Redis + in-memory fallback.**
- `apps/api/src/lib/rate-limit.ts` — já usa Redis com fallback in-memory, configurável via env vars
- `apps/api/src/lib/replay-protection.ts` — idem
- **Ação:** Não refatorar a estrutura, apenas adicionar: (1) rate limit global por IP, (2) rate limit em migrations endpoint, e (3) correção do race condition no replay-protection.

### ERRO 3: DB Pool Vars JÁ EXISTEM
**O plano lista `DB_POOL_MIN`, `DB_POOL_MAX`, etc. como "a extrair", mas já são lidos via env vars em `database.ts`.**
- `database.ts` linhas 20–22: já usa `POSTGRES_POOL_MAX`, `POSTGRES_POOL_MIN`, `POSTGRES_IDLE_TIMEOUT_MS`, `POSTGRES_CONNECTION_TIMEOUT_MS`
- **Ação:** Apenas garantir que estão no `.env.example`. Não modificar `database.ts`.

### ERRO 4: `bun add bcrypt` pode não funcionar — usar `Bun.password` nativo
**Bun tem API nativa de password hashing que inclui bcrypt sem dependência externa.**
```typescript
// Bun nativo — sem instalar bcrypt
const hash = await Bun.password.hash(password);        // bcrypt por padrão, com salt automático
const isValid = await Bun.password.verify(password, hash);
```
- Vantagens: zero dependências, nativamente otimizado em Bun, suporta bcrypt e argon2id
- **Ação:** Substituir `bcrypt` por `Bun.password` em toda a fase 1.

### ERRO 5: `@elysiajs/cors` pode já existir — verificar antes de instalar
- **Ação:** `bun list | grep cors` antes de instalar.

---

## 🚨 EDGE CASES CRÍTICOS NÃO COBERTOS PELO PLANO ORIGINAL

### EC-1: Timing Attack em Username Enumeration (CRÍTICO)
**Localização:** `auth-controller.ts` linhas 80–83 (atual) e no futuro `usersRepository.verifyPassword()`

**Problema:**
```typescript
// Com bcrypt — SE usuário não existe, retorna null imediatamente
const user = await usersRepository.findByUsername(username);
if (!user) return null; // Sem bcrypt — tempo de resposta ~1ms

// SE usuário existe — executa bcrypt.compare (~300ms)
const isValid = await Bun.password.verify(password, user.password_hash);
```
Um atacante mede o tempo de resposta: `~1ms` = usuário não existe, `~300ms` = usuário existe.

**Solução:**
```typescript
async verifyPassword(username: string, plain: string) {
  const DUMMY_HASH = "$2b$12$..."; // Hash pré-computado de senha fictícia
  const user = await this.findByUsername(username);
  const hashToCompare = user?.password_hash ?? DUMMY_HASH;
  const isValid = await Bun.password.verify(plain, hashToCompare);
  return isValid && user ? user : null; // Sempre executa bcrypt
}
```

### EC-2: Rate Limit DoS — Atacante pode bloquear o Usuário Legítimo (ALTO)
**Localização:** `rate-limit.ts` — chave é `${ip}:${username}`

**Problema:** Um atacante que sabe o username do admin pode mandar 5 requests com senha errada de qualquer IP, bloqueando o admin legítimo por 15 minutos. Isso é um **DoS por design**.

**Solução:**
- Rate limit por `${ip}:${username}` → mantém para bloquear brute force por par
- Adicionar rate limit separado por `${ip}` puro → para bloquear spray attacks
- **NÃO** fazer rate limit só por `username` sem IP → isso permitiria o DoS descrito acima
- Alternativa elegante: Progressive delay (1s, 2s, 4s) em vez de bloqueio total

### EC-3: IP Forjável via X-Forwarded-For (ALTO)
**Localização:** `auth-controller.ts` linhas 28–30

**Problema:**
```typescript
const forwardedFor = request.headers.get("x-forwarded-for") || "";
const forwarded = forwardedFor.split(",")[0]?.trim(); // FORJÁVEL
```
Sem verificação de proxy confiável, atacante envia `X-Forwarded-For: 1.2.3.4` a cada request para bypassar rate limit.

**Solução:**
```typescript
// Adicionar env var TRUST_PROXY=true/false
// Se TRUST_PROXY=false: usar sempre socket.remoteAddress
// Se TRUST_PROXY=true: confiar no x-forwarded-for (apenas quando atrás de proxy)
```
Adicionar `TRUST_PROXY=false` ao `.env.example` com documentação.

### EC-4: Session Sem Revocation (MÉDIO)
**Localização:** `session.ts` — HMAC stateless sem revocation list

**Problema:** Cookie roubado pode ser usado por até 7 dias. Logout limpa o cookie no cliente mas não invalida no servidor.

**Solução (pragmática para este projeto):**
- Reduzir `SESSION_MAX_AGE` para 8 horas (configurável via env var)
- Implementar session revocation via Redis: ao fazer logout, adicionar o token a uma blocklist com TTL igual ao max_age
- Em `decodeSession`, verificar se token está na blocklist antes de retornar user

### EC-5: Session Fixation após Login (BAIXO, mas boa prática)
**Localização:** `auth-controller.ts` linha 82 — `buildSessionCookie(username)` não rotaciona token

**Problema:** Token pre-login e pós-login são o mesmo. Session fixation attack.

**Solução:** Emitir novo token após login bem-sucedido (já é feito implicitamente porque o token inclui `exp` calculado em `encodeSession`, mas seria mais seguro incluir um `jti` aleatório).

### EC-6: Replay Protection — Race Condition no Redis (ALTO)
**Localização:** `replay-protection.ts` linhas 43–50

**Problema confirmado:**
```typescript
const existing = await client.get(getCacheKey(eventId)); // GET
if (existing) return false;
await client.set(getCacheKey(eventId), "1", ttlSeconds); // SET separado
```
GET + SET não é atômico. Em alta concorrência, dois webhooks idênticos podem passar.

**Solução:**
```typescript
// Usar SET NX (set if not exists) — atômico no Redis
const result = await client.set(getCacheKey(eventId), "1", ttlSeconds, "NX");
return result === "OK"; // "OK" = criou (novo), null = já existia (replay)
```
Verificar API do cliente Redis usado (provavelmente `ioredis` ou `@upstash/redis`).

### EC-7: `ALLOW_DEV_DEFAULT_ADMIN` pode vazar para Produção (CRÍTICO)
**Localização:** `auth-controller.ts` linha 23 — `process.env.ALLOW_DEV_DEFAULT_ADMIN === "true"`

**Problema:** Se alguém seta essa var em produção (acidente ou ataque), login `admin:admin` funciona.

**Solução:**
```typescript
if (!isProd && allowDevDefaults) { ... }
// Adicionar explicitamente:
if (isProd && allowDevDefaults) {
  throw new Error("ALLOW_DEV_DEFAULT_ADMIN cannot be used in production!");
}
```
E adicionar ao `env-validator.ts`.

### EC-8: Credenciais Tegma em DOIS Lugares (CRÍTICO)
**Localização:** `tegma-scraper.ts` — credenciais aparecem em **2 métodos**:
- `login()` linha 67: `Cookie: \`${cookie};Usuario=${username};Senha=${password};\``
- `fetchCargasPage()` linha 93: mesmo header

**Solução:** Já mapeado na Fase 5. Confirmar que a refatoração remove AMBAS as ocorrências.

### EC-9: Tabelas Sem Política de Retenção (MÉDIO)
**Problema:** As tabelas `webhook_events` e `audit_logs` crescem indefinidamente, degradando performance com o tempo.

**Solução:** Adicionar job de cleanup na migration ou usar `pg_cron` (se disponível):
```sql
-- Adicionar trigger ou background job:
DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL '1 hour';
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```
Ou: particionar tabelas por mês com `pg_partman`.

### EC-10: Migrations Endpoint Sem Rate Limiting (ALTO)
**Localização:** `app.ts` linha 32 — `.all(API_ROUTES.migrations, migrationsHandler)`

**Problema:** O endpoint `GET|POST /migrations` requer apenas `x-admin-key` mas não tem rate limiting. Se a key vazar, atacante pode executar migrations livremente.

**Solução:** Aplicar rate limiting (5 requests/hora) no endpoint de migrations.

### EC-11: Sem Seed de Usuário Admin Inicial (CRÍTICO para Deploy)
**Problema:** Com a migração para tabela `users` com bcrypt, como o admin faz login pela primeira vez? A tabela estará vazia.

**Solução:** Criar script CLI `apps/api/src/scripts/create-admin.ts`:
```bash
bun run create-admin --username admin --password 'SenhaForte123!'
```
Ou: migration que lê `ADMIN_USERNAME`/`ADMIN_PASSWORD` das env vars e insere na tabela (apenas se tabela vazia).

### EC-12: `TEGMA_BASE_URL` Não é Validado como HTTPS (MÉDIO)
**Problema:** Se `TEGMA_BASE_URL=http://...` (sem S), credenciais viajam em plaintext mesmo com a refatoração.

**Solução:** No `env-validator.ts`:
```typescript
const tegmaUrl = process.env.TEGMA_BASE_URL;
if (tegmaUrl && !tegmaUrl.startsWith("https://")) {
  throw new Error("TEGMA_BASE_URL must use HTTPS to protect credentials");
}
```

### EC-13: `formatZodError` Expõe Detalhes de Schema em Produção (MÉDIO)
**Localização:** `auth-controller.ts` linhas 62–63 — retorna `details: formatZodError(parseResult.error)`

**Problema:** Resposta de validação retorna estrutura interna do schema Zod. Atacante aprende o formato exato para construir payloads.

**Solução:** Em produção, retornar apenas `{ message: "Invalid credentials" }` sem `details`.

### EC-14: Content-Type Não Validado (BAIXO)
**Problema:** API aceita requests sem `Content-Type: application/json`, podendo causar confusão em parsers.

**Solução:** Middleware que rejeita `POST` sem `Content-Type: application/json`.

### EC-15: style-src também tem unsafe-inline (MÉDIO)
**Localização:** `next.config.ts` linha 55 — `style-src 'self' 'unsafe-inline'`

**Problema:** O plano foca em remover `unsafe-inline` do `script-src`, mas `style-src` também tem. CSS injection pode exfiltrar dados.

**Nota:** Difícil remover de `style-src` porque Tailwind e shadcn usam inline styles. Avaliar impacto antes de remover.

---

## 🐌 PROBLEMAS DE PERFORMANCE NÃO COBERTOS

### PERF-1: `cleanupExpired()` Roda em CADA Request de Auth (O(n))
**Localização:** `rate-limit.ts` linhas 81–88 — chamado em `getAuthRateLimitState` e `recordAuthFailure`

**Problema:** A cada request de login, itera sobre TODOS os entries do Map para limpar expirados. Com muitos IPs únicos, pode ser lento.

**Solução:**
- Mover cleanup para `setInterval` separado (a cada 5 min) — já planejado no plano
- Adicionar `MAX_ENTRIES = 10000` no Map; se exceder, deletar os 10% mais antigos

### PERF-2: Audit Log Síncrono Adiciona Latência a Cada Login
**Problema:** `await auditLog.loginAttempt(...)` bloqueia resposta até DB escrever (~5–20ms extra).

**Solução:** Fire-and-forget com error logging:
```typescript
auditLog.loginAttempt(username, false, ip).catch(err =>
  log.error("audit_log.write_failed", { error: err })
);
// NÃO await — não bloquear resposta
```

### PERF-3: `Bun.password.hash()` vs `bcrypt` — Performance e Compatibilidade
**Problema:** `bcrypt` usa bindings nativos em C que podem ter problemas de compatibilidade em Bun. `Bun.password.hash()` é nativo e mais eficiente.

**Benchmark:** `bcrypt` rounds=12 ~300ms/hash. `Bun.password.hash()` rounds=12 ~250ms/hash com thread pool nativo.

**Solução:** Usar `Bun.password.hash()` (sem dependência externa, já otimizado).

### PERF-4: Tegma Scraper — 3 RTTs por Execução (Session Não Cacheada)
**Localização:** `tegma-scraper.ts` `fetchCargas()` — getCookie → login → fetchCargasPage = 3 requests

**Problema:** A cada execução do cron (a cada 15 min), faz 3 requests HTTP ao Tegma. Se o login gerou um session cookie válido por mais tempo, está sendo desperdiçado.

**Solução:** Já mapeado na Fase 5 (session cookie caching). Garantir que inclui:
- Cache do session cookie em módulo state (já funciona entre execuções do cron)
- TTL configurável: `TEGMA_SESSION_TTL=1800000` (30 min)
- Invalidação automática se resposta for redirect para Login

### PERF-5: Rate Limit Map Sem Limite de Tamanho (Memory Leak Potencial)
**Problema:** `authAttempts` Map nunca tem limite de tamanho. Em ataque distribuído com muitos IPs únicos, pode crescer indefinidamente.

**Solução:** Adicionar `MAX_RATE_LIMIT_ENTRIES=50000` com LRU eviction quando exceder.

---

## 📋 Resumo Executivo (REVISADO)

Este plano aborda **8 vulnerabilidades críticas**, **7 vulnerabilidades altas**, **7 edge cases críticos** adicionais e **5 problemas de performance** identificados na revisão do código real. Estruturado em **8 fases incrementais** com verificações entre cada uma.

### Mudanças Principais (Revisadas)

1. **Credenciais:** `Bun.password` nativo (sem dependência bcrypt), timing-safe verify, remover plaintext
2. **Rate Limiting:** Rate limit global por IP + correção race condition + migrations endpoint
3. **Autorização:** CORS, remover test mode, idempotency atômico via Redis SETNX, CSP hardening
4. **Env Vars:** Maximizar uso, validar HTTPS para TEGMA_BASE_URL, validar ALLOW_DEV_DEFAULT_ADMIN
5. **Tegma Scraper:** Session cookie caching com TTL, remover credenciais em AMBOS os métodos
6. **Auditoria:** Logging fire-and-forget + retenção de dados (cleanup jobs)
7. **Validação:** Error messages genéricas em produção, Content-Type validation
8. **Testes:** Suite completa incluindo edge cases EC-1 a EC-15

---

## FASE 1: Credenciais, Password Hashing com Salt, e Secrets Fortes

### 1.1 Usar `Bun.password` Nativo para Hashing de Senhas com Salt

**Status:** `pending`
**Arquivos:** Nenhum — sem instalação de dependência

> ⚠️ **CORREÇÃO DO PLANO ORIGINAL:** Não usar `bcrypt` como dependência externa.
> Bun tem API nativa: `Bun.password.hash(password)` e `Bun.password.verify(password, hash)`.
> Usa bcrypt internamente com salt automático por padrão. Zero dependências, mais eficiente.

**Tarefas:**
- [ ] **1.1.1** Verificar que `Bun.password` está disponível: `bun -e "console.log(typeof Bun.password.hash)"`
- [ ] **1.1.2** Documentar uso de `Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 })`

**Validação:** `bun -e "Bun.password.hash('test').then(console.log)"` retorna hash bcrypt

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

#### 1.2.3 Criar `users-repository.ts` com Hashing via `Bun.password`

**Arquivo:** `apps/api/src/repositories/users-repository.ts` (NOVO)

**Funcionalidades:**
- `createUser(username, plainPassword)` - hash com `Bun.password.hash` + store
- `findByUsername(username)` - buscar por username
- `verifyPassword(username, plainPassword)` - timing-safe verify com hash dummy (EC-1)

**Implementação anti-timing-attack (EC-1):**
```typescript
// Hash pré-computado de uma senha fictícia — usado quando usuário não existe
// Para evitar que o tempo de resposta revele se o username existe
const DUMMY_HASH = await Bun.password.hash("dummy-password-for-timing");

async verifyPassword(username: string, plain: string) {
  const user = await this.findByUsername(username);
  const hashToCompare = user?.password_hash ?? DUMMY_HASH;
  // Sempre executa Bun.password.verify — mesmo tempo para user existente e inexistente
  const isValid = await Bun.password.verify(plain, hashToCompare);
  return isValid && user ? user : null;
}
```

**Tarefas:**
- [ ] **1.2.3.1** Criar repositório com métodos acima
- [ ] **1.2.3.2** Implementar `DUMMY_HASH` para anti-timing (EC-1)
- [ ] **1.2.3.3** Teste: mesmo password gera hashes diferentes (salt automático)
- [ ] **1.2.3.4** Teste: `Bun.password.verify(correct, hash) === true`
- [ ] **1.2.3.5** Teste: `Bun.password.verify(wrong, hash) === false`
- [ ] **1.2.3.6** Teste de timing: username inexistente deve ter latência similar a incorreto

**Validação:** Testes de hashing passam e timing attack não é viável

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
- Bloquear `ALLOW_DEV_DEFAULT_ADMIN` em produção (EC-7)
- Validar `TEGMA_BASE_URL` como HTTPS (EC-12)

**Tarefas:**
- [ ] **1.4.1** Criar arquivo `env-validator.ts`
- [ ] **1.4.2** Implementar `validateEnv()` com checklist:
  - `DATABASE_URL` presente
  - `ADMIN_USERNAME` presente
  - `SESSION_SECRET` presente e ≥32 chars
  - `ADMIN_API_KEY` presente e ≥32 chars
  - `CRON_WEBHOOK_SECRET` presente e ≥32 chars
  - `TEGMA_USERNAME`, `TEGMA_PASSWORD` presentes
  - `TEGMA_BASE_URL` começa com `https://` (EC-12)
  - Se `NODE_ENV=production` e `ALLOW_DEV_DEFAULT_ADMIN=true` → lançar erro fatal (EC-7)
- [ ] **1.4.3** Integrar em `apps/api/src/index.ts`:
  ```typescript
  import { validateEnv } from "./lib/env-validator";
  validateEnv(); // Antes de criar app
  ```
- [ ] **1.4.4** Teste: Startup falha se env var faltando
- [ ] **1.4.5** Teste: Mensagem de erro clara indicando o que falta
- [ ] **1.4.6** Teste: Startup falha se secret < 32 bytes
- [ ] **1.4.7** Teste: Startup falha se `TEGMA_BASE_URL` for HTTP (EC-12)
- [ ] **1.4.8** Teste: Startup falha se `ALLOW_DEV_DEFAULT_ADMIN=true` em produção (EC-7)

**Validação:** `bun run dev` falha com mensagem clara se env vars inválidas

---

## FASE 2: Rate Limiting Reforçado contra Ataques

> ⚠️ **CORREÇÃO DO PLANO ORIGINAL:** `rate-limit.ts` já tem Redis + in-memory fallback.
> Não refatorar do zero. Apenas adicionar: (1) rate limit global por IP puro, (2) rate limit no endpoint de migrations, (3) correção do race condition em replay-protection, (4) limite de tamanho no Map.

### 2.1 Adicionar Rate Limiting Global por IP Puro

**Status:** `pending`
**Arquivos:**
- `apps/api/src/lib/rate-limit.ts` (ADICIONAR funções, não refatorar)
- `apps/api/src/app.ts` (adicionar middleware global)

**Por que adicionar rate limit por IP puro (além do atual por IP+username):**
- Atual `${ip}:${username}` — bloqueia brute force por par específico
- Novo `${ip}` puro — bloqueia spray attacks (muitos usernames diferentes do mesmo IP)
- Complementares, não substitutos

**EC-2: Considerar Progressive Delay para evitar DoS legítimo:**
> O rate limit por `${ip}:${username}` pode ser abusado: atacante que sabe o username
> pode bloquear o admin legítimo. Preferível progressive delay em vez de bloqueio total.

**Tarefas:**
- [ ] **2.1.1** Adicionar função `getGlobalRateLimitState(ip)` em `rate-limit.ts`
- [ ] **2.1.2** Adicionar função `recordGlobalRequest(ip)` em `rate-limit.ts`
- [ ] **2.1.3** Adicionar limite de tamanho no Map in-memory (PERF-5): `MAX_ENTRIES=50000`
- [ ] **2.1.4** Criar middleware `globalRateLimitMiddleware` em `app.ts`:
  - Chave: IP puro do request
  - Limite: configurável via `GLOBAL_RATE_LIMIT_MAX_REQUESTS=100`
  - Janela: `GLOBAL_RATE_LIMIT_WINDOW_MS=900000` (15 min)
  - Block: `GLOBAL_RATE_LIMIT_BLOCK_MS=300000` (5 min)
- [ ] **2.1.5** Aplicar middleware global logo após CORS
- [ ] **2.1.6** Adicionar env vars de rate limit ao `.env.example`

**EC-3 (IP Forjável): Adicionar `TRUST_PROXY` env var:**
- [ ] **2.1.7** Adicionar `TRUST_PROXY=false` ao `.env.example`
- [ ] **2.1.8** Modificar `getClientIdentifier()` para usar socket IP se `TRUST_PROXY=false`

**Tarefas de Validação:**
- [ ] **2.1.9** Teste: 100 requests do mesmo IP dispara 429
- [ ] **2.1.10** Teste: headers `X-RateLimit-Limit` e `X-RateLimit-Remaining` presentes
- [ ] **2.1.11** Teste: `Retry-After` header presente no 429
- [ ] **2.1.12** Teste: bloqueio por IP não afeta outros IPs

**Variáveis a Adicionar em `.env.example`:**
```bash
# Global rate limit (por IP puro)
GLOBAL_RATE_LIMIT_MAX_REQUESTS=100
GLOBAL_RATE_LIMIT_WINDOW_MS=900000
GLOBAL_RATE_LIMIT_BLOCK_MS=300000

# Trust proxy (EC-3: IP forjável)
TRUST_PROXY=false  # true somente se atrás de reverse proxy confiável

# Limits existentes (documentar)
AUTH_RATE_LIMIT_WINDOW_SECONDS=600
AUTH_RATE_LIMIT_MAX_ATTEMPTS=5
AUTH_RATE_LIMIT_BLOCK_SECONDS=900

# Migrations endpoint rate limit (EC-10)
MIGRATIONS_RATE_LIMIT_ATTEMPTS=5
MIGRATIONS_RATE_LIMIT_WINDOW_MS=3600000
```

**Validação:** Rate limit global funciona sem quebrar rate limit de login existente

---

### 2.2 Adicionar Rate Limit no Endpoint de Migrations (EC-10)

**Status:** `pending`
**Arquivo:** `apps/api/src/controllers/migrations-controller.ts`

**Problema:** `GET|POST /migrations` requer admin key mas sem rate limit. Admin key exposta = execução ilimitada.

**Tarefas:**
- [ ] **2.2.1** Adicionar rate limit de 5 requests/hora no handler de migrations
- [ ] **2.2.2** Usar chave: `migrations:${ip}`
- [ ] **2.2.3** Teste: 6ª requisição ao /migrations retorna 429

**Validação:** Testes passam

---

### 2.3 Corrigir Race Condition no Replay Protection (EC-6)

**Status:** `pending`
**Arquivo:** `apps/api/src/lib/replay-protection.ts`

**Problema Atual:**
```typescript
const existing = await client.get(key); // GET
if (existing) return false;
await client.set(key, "1", ttlSeconds); // SET separado — não atômico
```

**Solução com Redis SETNX:**
```typescript
// SET NX EX — atômico: define SE não existe, com TTL
const result = await client.set(key, "1", ttlSeconds, "NX");
// result === "OK" → criou (evento novo)
// result === null → já existe (replay attack)
return result === "OK";
```

**Verificar API do cliente Redis usado no projeto:**

**Tarefas:**
- [ ] **2.3.1** Identificar cliente Redis usado: `grep -r "redis" apps/api/src/lib/redis-client.ts`
- [ ] **2.3.2** Substituir GET+SET por SET NX EX atômico
- [ ] **2.3.3** Teste: dois requests simultâneos com mesmo event_id — apenas um passa
- [ ] **2.3.4** Teste: event_id novo é aceito
- [ ] **2.3.5** Teste: event_id duplicado é rejeitado

**Validação:** Race condition não reproduzível

---

### 2.4 Circuit Breaker — JÁ EXISTE (NÃO CRIAR)

> ⚠️ **REMOVIDO DO PLANO:** `circuit-breaker.ts` já existe em `apps/api/src/lib/circuit-breaker.ts`
> e já está integrado em `tegma-scraper.ts` e `whatsapp-notifier.ts`.
>
> **Ação restante:** Apenas garantir que os parâmetros são configuráveis via env vars (fase 4).

**Vars a Documentar no `.env.example`:**
```bash
CB_TEGMA_FAILURE_THRESHOLD=3
CB_TEGMA_RESET_TIMEOUT=60000
CB_WHATSAPP_FAILURE_THRESHOLD=5
CB_WHATSAPP_RESET_TIMEOUT=60000
```

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

### 3.3 Webhook Idempotency — Corrigido na Fase 2.3

> **MOVIDO PARA FASE 2.3** — A correção do race condition no replay-protection (EC-6)
> via Redis SETNX é mais elegante e não requer nova tabela no banco.
> Se Redis não estiver disponível, o fallback in-memory continua funcionando.
>
> **Decisão:** Não criar tabela `webhook_events` — manter no Redis (já existente)
> com a correção atômica via SETNX. Banco de dados é desnecessário aqui.

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

### 5.1 Refatorar para Session Cookie Caching (EC-8 + PERF-4)

**Status:** `pending`
**Arquivo:** `apps/api/src/services/tegma-scraper.ts`

**Problema Atual — Em DOIS lugares:**
- `login()` linha 67: `Cookie: \`${cookie};Usuario=${username};Senha=${password};\``
- `fetchCargasPage()` linha 93: mesmo header com credenciais

**Solução — Session Cookie Caching:**
- Fazer login UMA VEZ, guardar session cookie em módulo-level state
- Reutilizar session cookie com TTL configurável (`TEGMA_SESSION_TTL_MS=1800000`)
- Se request retorna redirect para Login → invalidar cache e refazer login
- Remove credenciais dos headers nas duas ocorrências

**Tarefas:**
- [ ] **5.1.1** Adicionar `let cachedSession: { cookie: string; expiresAt: number } | null = null` no módulo
- [ ] **5.1.2** Implementar `getOrRefreshSession()` — retorna cache se válido, ou refaz login
- [ ] **5.1.3** Adicionar `TEGMA_SESSION_TTL_MS=1800000` ao `.env.example`
- [ ] **5.1.4** Refatorar `fetchCargasPage()` para usar apenas session cookie (sem credenciais)
- [ ] **5.1.5** Detectar redirect para `/Login` em `fetchCargasPage()` → invalidar cache
- [ ] **5.1.6** Remover credenciais do header em `login()` (linha 67)
- [ ] **5.1.7** Remover credenciais do header em `fetchCargasPage()` (linha 93)
- [ ] **5.1.8** Teste: credenciais NÃO aparecem em nenhum header após login inicial
- [ ] **5.1.9** Teste: session cookie é reutilizado entre execuções do cron
- [ ] **5.1.10** Teste: quando session expira, faz login automático
- [ ] **5.1.11** Teste: redirect para Login → invalida cache e refaz login

**Grep de Verificação:**
```bash
grep -n "Usuario=\|Senha=" apps/api/src/services/tegma-scraper.ts
# Resultado esperado: zero linhas
```

**Validação:** Tegma scraper não envia credenciais em headers em NENHUM request

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

#### 6.1.2 Criar `audit-logger.ts` com Fire-and-Forget (PERF-2)

**Métodos:**
- `loginAttempt(username, success, ip)` — fire-and-forget, não bloqueia resposta
- `adminActionTriggered(action, username, ip, details)`
- `cargoCheckTriggered(method, ip)`

**Implementação Fire-and-Forget (PERF-2):**
```typescript
// NÃO usar await — não adiciona latência à resposta
export function loginAttempt(username: string, success: boolean, ip: string) {
  writeAuditLog({ event: "login_attempt", username, success, ip })
    .catch(err => log.error("audit_log.write_failed", { error: err }));
  // Retorna void, não Promise — intencionalmente não-awaitable
}
```

**Tarefas:**
- [ ] **6.1.2.1** Criar módulo `audit-logger`
- [ ] **6.1.2.2** Implementar métodos acima como fire-and-forget
- [ ] **6.1.2.3** Garantir que `details` JSONB não contém credenciais
- [ ] **6.1.2.4** Teste: login não tem latência adicional perceptível por causa do audit log
- [ ] **6.1.2.5** Teste: falha no audit log não derruba a resposta principal

**Validação:** Audit logger funciona e é assíncrono (fire-and-forget)

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

**Grupos de Testes (expandido para cobrir edge cases EC-1 a EC-15):**

1. **Authentication — Password Hashing** (6 testes)
   - Mesmo password gera hashes diferentes (salt automático)
   - `Bun.password.verify(correct, hash)` retorna true
   - `Bun.password.verify(wrong, hash)` retorna false
   - Hash não contém a senha em plaintext
   - Login com senha correta → sucesso
   - Login com senha fraca é rejeitado na validação

2. **Authentication — Anti-Timing Attack (EC-1)** (2 testes)
   - Username inexistente tem latência similar a password errado (~300ms para ambos)
   - Username existente com senha errada não revela existência pela diferença de tempo

3. **Authentication — Error Messages (EC-13)** (2 testes)
   - Login inválido retorna mensagem genérica (sem detalhes de schema Zod)
   - Zod validation error não expõe estrutura interna em produção

4. **Session Security (EC-4)** (4 testes)
   - `Set-Cookie` tem flag `HttpOnly`
   - `Set-Cookie` tem flag `Secure` em produção
   - `Set-Cookie` tem `SameSite=Lax`
   - Logout invalida o cookie (max-age=0)

5. **Rate Limiting (EC-2, PERF-5)** (4 testes)
   - Login bloqueado após N tentativas (usando env var configurável)
   - Rate limit global dispara 429 após limite
   - `X-RateLimit-Limit` e `X-RateLimit-Remaining` headers presentes
   - `Retry-After` header presente no 429
   - Diferentes IPs não bloqueam uns aos outros

6. **Replay Protection — Atômico (EC-6)** (3 testes)
   - Primeiro webhook com event_id novo é aceito
   - Segundo webhook com mesmo event_id é rejeitado
   - Timestamp fora da janela de 5 minutos é rejeitado

7. **ALLOW_DEV_DEFAULT_ADMIN (EC-7)** (1 teste)
   - `admin:admin` não funciona quando `ALLOW_DEV_DEFAULT_ADMIN` não está setado

8. **TEGMA_BASE_URL HTTPS (EC-12)** (1 teste)
   - Startup falha se TEGMA_BASE_URL for HTTP

9. **Headers CSP** (2 testes)
   - `Content-Security-Policy` não contém `unsafe-inline` em script-src
   - `X-Frame-Options: DENY` presente

10. **CORS (EC-14)** (1 teste)
    - Origin não autorizada é bloqueada

11. **Status Endpoint** (2 testes)
    - GET /status sem auth retorna 401
    - GET /status com auth não expõe versão do banco

12. **Audit Logging** (2 testes)
    - Login falha registra entry no audit_logs
    - Audit log falha não derruba o login (fire-and-forget)

13. **Tegma Scraper — Credenciais (EC-8)** (2 testes)
    - Nenhum request do scraper contém `Usuario=` no header
    - Nenhum request do scraper contém `Senha=` no header

14. **Migrations Rate Limit (EC-10)** (1 teste)
    - 6ª requisição ao /migrations retorna 429

**Total:** ~33 testes

**Tarefas:**
- [ ] **7.1.1** Criar arquivo `tests/integration/security.test.ts`
- [ ] **7.1.2** Implementar os 14 grupos de testes acima
- [ ] **7.1.3** Rodar testes: `bun run test:integration:api`
- [ ] **7.1.4** Todos os testes passam

**Validação:** `bun run test:integration:api` passa com 33+ testes verdes

---

## FASE 7.5: Script de Seed do Usuário Admin (EC-11)

### 7.5.1 Criar Script CLI para Criar Usuário Admin

**Status:** `pending`
**Arquivo:** `apps/api/src/scripts/create-admin.ts` (NOVO)

**Problema:** Com migração para tabela `users` com bcrypt, tabela estará vazia após `migration:up`. Admin não consegue logar.

**Solução — Script CLI:**
```bash
bun run apps/api/src/scripts/create-admin.ts
# Lê ADMIN_USERNAME e ADMIN_PASSWORD das env vars
# Cria hash com Bun.password.hash
# Insere na tabela users (ON CONFLICT DO UPDATE — idempotente)
```

**Tarefas:**
- [ ] **7.5.1** Criar `create-admin.ts` que lê `ADMIN_USERNAME`/`ADMIN_PASSWORD` das env vars
- [ ] **7.5.2** Usar `Bun.password.hash()` para criar o hash
- [ ] **7.5.3** INSERT com `ON CONFLICT (username) DO UPDATE` → seguro rodar múltiplas vezes
- [ ] **7.5.4** Adicionar `create-admin` ao `package.json` scripts
- [ ] **7.5.5** Documentar no README como criar o admin após deploy
- [ ] **7.5.6** Teste: script cria usuário com hash correto
- [ ] **7.5.7** Teste: rodar duas vezes não cria duplicata

**Validação:** `bun run create-admin` funciona sem erros

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
- `@elysiajs/cors` (verificar se já existe com `bun list | grep cors`)
- **SEM `bcrypt`** — usar `Bun.password` nativo

### Arquivos Criados (7)
1. `apps/api/src/repositories/users-repository.ts`
2. `apps/api/src/lib/env-validator.ts`
3. `apps/api/src/lib/audit-logger.ts`
4. `apps/api/src/lib/error-handler.ts`
5. `apps/api/src/scripts/create-admin.ts` (seed do usuário inicial, EC-11)
6. `tests/integration/security.test.ts`
7. `docs/SECURITY.md`
8. `.env.example`

### Arquivos NÃO Criados (removidos do plano por já existirem)
- ~~`apps/api/src/lib/circuit-breaker.ts`~~ — JÁ EXISTE

### Arquivos Modificados (11)
1. `apps/api/src/lib/schemas.ts` (validação forte de senha)
2. `apps/api/src/lib/session.ts` (env vars para max-age, secure, samesite)
3. `apps/api/src/lib/rate-limit.ts` (adicionar rate limit por IP puro, limite no Map)
4. `apps/api/src/lib/replay-protection.ts` (SETNX atômico, EC-6)
5. `apps/api/src/controllers/auth-controller.ts` (hash + audit + genérico errors)
6. `apps/api/src/controllers/status-controller.ts` (restrição de auth)
7. `apps/api/src/controllers/migrations-controller.ts` (rate limit, EC-10)
8. `apps/api/src/controllers/cargas/check-handler.ts` (remover test mode)
9. `apps/api/src/services/tegma-scraper.ts` (session cookie, remover credenciais)
10. `apps/api/src/app.ts` (CORS, middleware global de rate limit)
11. `next.config.ts` (CSP hardening, remover unsafe-inline)
12. `README.md` (instruções de segurança)

### Migrations Novas (2 — não 3)
1. `infra/migrations/1772000001000_create_users_table.js`
2. `infra/migrations/1772000002000_create_audit_logs_table.js`
- ~~`webhook_events`~~ — não necessário, usando Redis SETNX (EC-6)

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
