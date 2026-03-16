# Security Hardening Documentation

This document describes the comprehensive security measures implemented in the notifica-frete project.

## Security Features Overview

### EC-1: Timing-Safe Password Verification

**Problem**: Username enumeration attacks where attackers can determine if a username exists by measuring response time differences.

**Solution**: Implement timing-safe password verification using a dummy hash approach.

**Implementation** (`apps/api/src/repositories/users-repository.ts`):

- Always run `Bun.password.verify()` regardless of whether user exists
- Use a pre-computed dummy hash for non-existent users
- Both paths (valid user / non-existent user) complete in similar time
- Prevents attackers from discovering valid usernames via timing analysis

**Configuration**:

```env
BCRYPT_ROUNDS=12  # Cost factor for bcrypt hashing
```

### EC-5: Global Rate Limiting (Spray Attack Prevention)

**Problem**: Attackers can perform distributed brute-force attacks by making many requests across different usernames from multiple IPs.

**Solution**: Implement global rate limiting by IP address to detect and block spray attacks.

**Implementation** (`apps/api/src/lib/rate-limit.ts`, `apps/api/src/app.ts`):

- Track requests per IP address
- Default: 100 requests per 15 minutes per IP
- Block IP for 5 minutes after limit exceeded
- Memory-efficient with LRU eviction at 50K entries (PERF-5)
- Optional Redis support for distributed deployments

**Middleware** (added to all requests in `apps/api/src/app.ts`):

```typescript
// Checks rate limit before processing request
// Returns 429 with Retry-After header if limited
```

**Configuration**:

```env
GLOBAL_RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
GLOBAL_RATE_LIMIT_MAX_REQUESTS=100       # requests per window
GLOBAL_RATE_LIMIT_BLOCK_MS=300000        # 5 minute block
```

### EC-6: Atomic Webhook Event Deduplication

**Problem**: Race condition in webhook event processing where concurrent requests could process the same event twice.

**Solution**: Use atomic Redis SETNX operation to atomically check and set event ID.

**Implementation** (`apps/api/src/lib/redis-client.ts`, `apps/api/src/lib/replay-protection.ts`):

- Added `setnx()` method to RedisClient interface
- For ioredis: Uses native `SET key value NX EX ttl` atomic operation
- For in-memory: Atomic check-then-set with proper expiration
- Returns boolean: true if key was set, false if already existed
- Prevents duplicate event processing even under high concurrency

**Before (vulnerable)**:

```typescript
const existing = await client.get(key); // Race condition window
if (!existing) {
  await client.set(key, "1", ttl); // Multiple requests could both succeed
}
```

**After (secure)**:

```typescript
const wasSet = await client.setnx(key, "1", ttl); // Atomic operation
```

### EC-7: Environment Variable Validation

**Problem**: Application starts with misconfigured security settings, allowing attacks.

**Solution**: Validate all required environment variables at startup before creating app instance.

**Implementation** (`apps/api/src/lib/env-validator.ts`):

- Checks all required variables are set
- Validates secret length (32+ bytes)
- Validates HTTPS URLs for external services (Tegma scraper)
- Blocks insecure development defaults in production (ALLOW_DEV_DEFAULT_ADMIN)
- Throws detailed error with clear guidance on fixing config

**Validations**:

- `POSTGRES_*` variables for database
- `SESSION_SECRET` minimum 32 characters
- `TEGMA_BASE_URL` must use HTTPS
- `ALLOW_DEV_DEFAULT_ADMIN` forbidden in production
- All API keys and secrets required

**Configuration**:

```env
SESSION_SECRET=at_least_32_characters_long_secret_here
ALLOW_DEV_DEFAULT_ADMIN=false  # Must be false or unset in production
```

### EC-8: Session Cookie Management

**Problem**: Credentials exposed in HTTP headers during Tegma scraper requests, vulnerable to interception and logging.

**Solution**: Use session cookies instead of sending credentials in every request.

**Implementation** (`apps/api/src/services/tegma-scraper.ts`):

- Initial login sends credentials in POST body only
- Server returns session cookie
- All subsequent requests use session cookie only
- Credentials never appear in HTTP headers

**Before (vulnerable)**:

```
Cookie: Usuario=username;Senha=password;
```

**After (secure)**:

```
Cookie: <session-id>  # Only session cookie
```

### EC-9: Generic Error Messages

**Problem**: Detailed error messages leak information about system internals (database structure, stack traces, etc).

**Solution**: Return generic error messages in production, detailed messages only in development.

**Implementation** (`apps/api/src/lib/error-handler.ts`):

- `formatErrorResponse()` function wraps error handling
- Development mode: Returns actual error messages
- Production mode: Returns generic "An error occurred"
- Full stack traces logged server-side for debugging
- Includes request ID for tracing without exposing details

**Features**:

- Prevents information disclosure (EC-9)
- Server-side logging of full error details
- Consistent error response format
- Request ID tracking for support/debugging

**Usage**:

```typescript
const response = formatErrorResponse(error, {
  isDev: process.env.NODE_ENV !== "production",
  defaultMessage: "An error occurred",
});
```

### EC-10: Rate Limiting for Sensitive Endpoints

**Problem**: Sensitive endpoints (migrations, user creation) vulnerable to brute force and abuse.

**Solution**: Apply authentication and rate limiting to sensitive endpoints.

**Implementation**:

- Admin API key (`x-admin-key` header) required for:
  - Migrations endpoint
  - Manual cargo check
  - User creation
- Cron webhook requires:
  - `x-cron-secret` header
  - Timestamp validation (prevents old replays)
  - Replay protection via Redis SETNX (EC-6)

### EC-11: Admin User Creation

**Problem**: No secure way to bootstrap initial admin user without hardcoded credentials.

**Solution**: Provide script for initial admin user creation with strong password validation.

**Implementation** (`apps/api/src/scripts/create-admin.ts`):

- CLI script: `bun run apps/api/src/scripts/create-admin.ts <username> <password>`
- Validates password strength:
  - Minimum 12 characters
  - Uppercase letter required
  - Lowercase letter required
  - Number required
  - Special character (!@#$%^&\*-\_=+) required
- Clear error messages for validation failures
- Creates user in database with bcrypt hashed password

**Usage**:

```bash
bun run apps/api/src/scripts/create-admin.ts admin "MySecurePass123!"
```

### EC-12: HTTPS Enforcement for External Services

**Problem**: Credentials sent to Tegma API could be intercepted if not using HTTPS.

**Solution**: Validate and enforce HTTPS URLs for external services.

**Implementation** (`apps/api/src/lib/env-validator.ts`):

- `TEGMA_BASE_URL` must start with `https://`
- Validation happens at app startup
- Clear error message if HTTP URL detected

## Performance Optimizations

### PERF-2: Fire-and-Forget Audit Logging

**Implementation** (`apps/api/src/lib/audit-logger.ts`):

- Audit events logged asynchronously using `setImmediate()`
- Non-blocking: audit writes don't affect response time
- Graceful error handling if audit database write fails
- Suitable for high-traffic scenarios

**Audit Events Tracked**:

- `login_success`: Successful authentication
- `login_failure`: Invalid credentials
- `login_rate_limited`: Rate limit exceeded
- `user_created`: New user created
- `password_updated`: Password changed
- `admin_api_accessed`: Admin API used
- `webhook_received`: Webhook accepted
- `webhook_rejected`: Webhook rejected (duplicate/invalid)

### PERF-5: Memory Leak Prevention in Rate Limiting

**Implementation** (`apps/api/src/lib/rate-limit.ts`):

- Global rate limit map capped at 50,000 entries
- LRU eviction: deletes 10% of oldest entries when limit exceeded
- Prevents unbounded memory growth under attack
- Logs eviction warnings for monitoring
- Automatic cleanup of expired entries (window + block time)

## Database Security

### Row-Level Security (RLS)

**Implementation** (`infra/migrations/1772000000000_harden-cargas-rls-and-privileges.js`):

- `notifica_frete_cargas` table has RLS enabled and enforced
- Policy: Only `api` role can access rows
- Current role verified via `current_setting('app.current_role')`
- PUBLIC role has no direct table access

**Table Names**:
All tables use `notifica_frete_` prefix to avoid conflicts in shared databases:

- `notifica_frete_cargas`: Cargo listings
- `notifica_frete_users`: User credentials
- `notifica_frete_audit_logs`: Security event logs

## Credential Management

### Strong Passwords

**Requirements** (`apps/api/src/lib/schemas.ts`):

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&\*-\_=+)

**Hashing**:

- Algorithm: bcrypt (via Bun.password.hash)
- Cost factor: 12 (configurable via BCRYPT_ROUNDS)
- Same for user passwords and dummy hash

### Environment Variable Secrets

**Requirements**:

- SESSION_SECRET: minimum 32 characters
- ADMIN_API_KEY: secret value (minimum 32 bytes recommended)
- CRON_WEBHOOK_SECRET: secret value
- REDIS_URL: only if Redis enabled (optional)

## Testing

### Security Test Suite

**Location**: `tests/integration/security.test.ts`

**Coverage**:

- EC-1: Timing-safe password verification
- EC-5: Global rate limiting by IP
- EC-6: Atomic webhook deduplication
- EC-7: Environment variable validation
- EC-8: Session cookie management (Tegma scraper)
- EC-9: Generic error messages
- EC-10: Rate limiting on sensitive endpoints
- PERF-2: Fire-and-forget audit logging
- PERF-5: Memory leak prevention
- Strong password validation
- Database security (RLS, table naming)

**Run Tests**:

```bash
bun run test:integration:all
# or specifically:
bun run test -- tests/integration/security.test.ts
```

## Deployment Checklist

- [ ] Set strong SESSION_SECRET (32+ characters)
- [ ] Set strong ADMIN_API_KEY
- [ ] Set strong CRON_WEBHOOK_SECRET
- [ ] Set ALLOW_DEV_DEFAULT_ADMIN=false
- [ ] Ensure TEGMA_BASE_URL uses HTTPS
- [ ] Set unique ADMIN_USERNAME and ADMIN_PASSWORD (or use create-admin script)
- [ ] If using separate API: set API_ORIGIN to actual API URL
- [ ] Optional: Configure Redis for distributed rate limiting
- [ ] Run migrations: `bun run migration:up`
- [ ] Create initial admin user: `bun run apps/api/src/scripts/create-admin.ts <user> <pass>`
- [ ] Verify environment variables with: `bun run apps/api/src/index.ts` (check startup logs)
- [ ] Run security tests: `bun run test:integration:all`

## Monitoring and Alerting

### Audit Logs

View recent security events:

```sql
SELECT * FROM notifica_frete_audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- Failed logins in last 24 hours
SELECT username, ip_address, COUNT(*) as attempts
FROM notifica_frete_audit_logs
WHERE event_type = 'login_failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY username, ip_address
ORDER BY attempts DESC;

-- Rate-limited IPs
SELECT ip_address, COUNT(*) as events, MAX(created_at) as latest
FROM notifica_frete_audit_logs
WHERE event_type = 'login_rate_limited'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
ORDER BY events DESC;
```

### Structured Logging

All security events logged with structured JSON:

```json
{
  "component": "rate_limit",
  "level": "warn",
  "message": "rate_limit.global_limit_exceeded",
  "ip": "192.168.1.1",
  "retry_after": 300,
  "timestamp": "2026-03-16T12:34:56Z"
}
```

## Related Security Standards

- **OWASP Top 10**: Addresses A03 - Injection, A07 - Authentication failures
- **CWE**: CWE-208 (Observable Timing Discrepancy), CWE-613 (Insufficient Session Expiration)
- **NIST**: SP 800-63B (Authentication and Lifecycle Management)

## Future Improvements

- [ ] Multi-factor authentication (MFA)
- [ ] Account lockout after suspicious activity
- [ ] IP whitelist/blacklist management
- [ ] Encryption at rest for sensitive fields
- [ ] API key rotation mechanisms
- [ ] Security headers (CSP, X-Frame-Options, etc)
- [ ] Web Application Firewall (WAF) integration
- [ ] Penetration testing and security audit

## Support

For security concerns or to report vulnerabilities:

1. Do not open public issues
2. Contact: security@example.com (replace with actual contact)
3. Allow 48 hours for initial response
