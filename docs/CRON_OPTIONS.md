# Cron Job Options & Fallbacks

This app supports multiple cron job strategies. Choose based on your infrastructure:

## 1. Vercel Cron (Recommended for Vercel Deployments)

**File:** `vercel.json`

**Pros:**

- Native Vercel integration
- No external dependencies
- Automatic logging in Vercel Dashboard

**Cons:**

- Requires Vercel Pro for cron jobs (free tier has limits)

**Setup:**

```bash
# Already configured in vercel.json
# Deploy and check Vercel Dashboard → Cron Jobs
```

**Verification:**

- Dashboard: Project → Settings → Cron Jobs
- Logs: Project → Deployments → Functions

---

## 2. Self-Hosted (Local/Server/Docker)

**Command:** `npm run cron`

**Pros:**

- Full control
- Works anywhere Node.js runs
- No platform limitations

**Cons:**

- Requires always-on server
- You manage uptime

**Setup:**

```bash
# Local development
npm run services:up
npm run migration:up
npm run cron

# Or with PM2 for production
pm2 start infra/cron-runner.js --name "cargas-cron"
```

**Docker Compose Option:**

```yaml
services:
  cron:
    build: .
    command: npm run cron
    environment:
      - DATABASE_URL=postgres://...
      - CRON_WEBHOOK_SECRET=your-secret
```

---

## 3. n8n Webhook (Fallback/Alternative)

**Endpoint:** `POST /api/v1/cargas/webhook`

**Pros:**

- Use your existing n8n infrastructure
- Visual workflow management
- Easy to monitor in n8n

**Cons:**

- Requires n8n instance running
- Extra network hop

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

3. **Disable or keep the existing DataTable insert** as backup

---

## 4. Hybrid Strategy (Recommended for Production)

Use **multiple** cron sources for redundancy:

```
Primary:   Vercel Cron (*/15 7-18 * * *)
Fallback1: n8n Webhook (*/15 7-18 * * *) - 5 min offset
Fallback2: Self-hosted (optional)
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
```

---

## Troubleshooting

| Issue                   | Solution                                               |
| ----------------------- | ------------------------------------------------------ |
| Vercel Cron not running | Check Vercel Dashboard → Cron Jobs. May need Pro plan. |
| n8n webhook 401         | Verify `CRON_WEBHOOK_SECRET` matches                   |
| Duplicate notifications | Check `id_viagem` UNIQUE constraint in database        |
| No cargas found         | Check Tegma credentials in environment variables       |
