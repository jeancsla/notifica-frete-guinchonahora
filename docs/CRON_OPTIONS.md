# Cron Job Options

This app supports multiple cron job strategies. Since Vercel Cron requires a paid plan, here are the free alternatives:

## 1. n8n Webhook (Recommended - Free)

**Endpoint:** `POST /api/v1/cargas/webhook`

Use your existing n8n infrastructure to trigger cargo checks. This is the recommended approach since you already have n8n running.

**Pros:**

- Free (uses your existing n8n)
- Visual workflow management
- Easy to monitor in n8n
- No additional servers needed

**Cons:**

- Requires n8n instance running

**Setup:**

1. **Set environment variable in Vercel:**

   ```
   CRON_WEBHOOK_SECRET=your-random-secret-here
   ```

2. **In n8n, modify "Notificação Mills" workflow:**
   - After "Remove Duplicates" node
   - Add **HTTP Request** node:
     - Method: POST
     - URL: `https://your-app.vercel.app/api/v1/cargas/webhook`
     - Headers:
       - `x-cron-secret`: `your-random-secret-here`
       - `x-cron-source`: `n8n`

3. **Keep or disable the existing DataTable insert** as you prefer

**Test command:**

```bash
curl -X POST https://your-app.vercel.app/api/v1/cargas/webhook \
  -H "x-cron-secret: your-webhook-secret" \
  -H "x-cron-source: n8n"
```

---

## 2. Self-Hosted (Local/Server/Docker)

**Command:** `bun run cron`

Run the cron job on your own server or local machine.

**Pros:**

- Full control
- Works anywhere Bun runs
- No platform limitations
- Free

**Cons:**

- Requires always-on server
- You manage uptime

**Setup:**

```bash
# Local development
bun run services:up
bun run migration:up
bun run cron

# Or with PM2 for production
pm2 start "bun run cron" --name "cargas-cron"
```

**Docker Compose Option:**

```yaml
services:
  cron:
    build: .
    command: bun run cron
    environment:
      - DATABASE_URL=postgres://...
      - CRON_WEBHOOK_SECRET=your-secret
```

---

## 3. Hybrid Strategy (Recommended for Production)

Use **both** n8n and self-hosted for redundancy:

```
Primary:   n8n Webhook (*/15 7-18 * * *)
Fallback:  Self-hosted (*/15 7-18 * * *) - 5 min offset
```

**Why this works:**

- Database has `UNIQUE` constraint on `id_viagem`
- Duplicate cargas are automatically rejected
- No risk of double notifications

---

## Environment Variables

| Variable              | Required For     | Description                       |
| --------------------- | ---------------- | --------------------------------- |
| `ADMIN_API_KEY`       | Manual API calls | Protects `/api/v1/cargas/check`   |
| `CRON_WEBHOOK_SECRET` | n8n/External     | Protects `/api/v1/cargas/webhook` |
| `DATABASE_URL`        | All              | PostgreSQL connection             |

---

## Monitoring

Check if cron is working:

```bash
# Check last processed cargas
curl https://your-app.vercel.app/api/v1/cargas?limit=5

# Manual trigger (with auth)
curl -X POST https://your-app.vercel.app/api/v1/cargas/check \
  -H "x-admin-key: your-admin-key"

# Webhook trigger (for n8n)
curl -X POST https://your-app.vercel.app/api/v1/cargas/webhook \
  -H "x-cron-secret: your-webhook-secret" \
  -H "x-cron-source: manual-test"

# Health check
curl https://your-app.vercel.app/api/v1/cargas/health
```

---

## Troubleshooting

| Issue                   | Solution                                         |
| ----------------------- | ------------------------------------------------ |
| n8n webhook 401         | Verify `CRON_WEBHOOK_SECRET` matches             |
| Duplicate notifications | Check `id_viagem` UNIQUE constraint in database  |
| No cargas found         | Check Tegma credentials in environment variables |
| Cron not running        | Check n8n execution logs or self-hosted server   |
