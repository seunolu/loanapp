# Production Deployment Runbook

## 1. Topology

Production services:

- `api`: NestJS HTTP app (`apps/api`)
- `jobs-runner`: background worker process (`pnpm -C apps/api jobs:runner`)
- `jobs-scheduler`: scheduled enqueue process (`pnpm -C apps/api jobs:schedule`)
- `postgres`: primary relational database
- `redis`: rate limiting + job locking

Separation of concerns:

- API serves requests only.
- Runner consumes and executes jobs.
- Scheduler enqueues daily jobs only (Option B).

## 2. Required Environment Variables

Set all variables from `apps/api/.env.example` plus deployment-specific values.

Minimum required for production:

- Core:
  - `NODE_ENV=production`
  - `PORT`
  - `API_PREFIX`
  - `LOG_LEVEL`
- Data:
  - `DATABASE_URL`
  - `REDIS_URL`
- Security:
  - `CORS_ALLOWED_ORIGINS` (explicit list, no wildcard)
  - `CORS_ALLOW_CREDENTIALS`
  - `REQUEST_BODY_LIMIT`
  - `PAYSTACK_WEBHOOK_SECRET`
  - `PAYSTACK_DISABLE_SIGNATURE_VERIFY=false`
  - `SENTRY_DSN` (recommended)
  - `SENTRY_TRACES_SAMPLE_RATE` (typically low in production)
- Auth/JWT:
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `REFRESH_TOKEN_HASH_SECRET`
  - `ADMIN_JWT_ACCESS_SECRET`
  - `ADMIN_JWT_REFRESH_SECRET`
  - `ADMIN_REFRESH_TOKEN_HASH_SECRET`
- Optional/bootstrap:
  - `ADMIN_BOOTSTRAP_*` are ignored in production by design.
  - `OTP_DEV_MODE` must be `false` in production.
- Jobs/penalties/notifications:
  - `PENALTY_DAILY_RATE_BPS`
  - `PENALTY_DAILY_CAP_KOBO`
  - `NOTIFICATIONS_ENABLED`
  - `SMS_PROVIDER`
  - `EMAIL_PROVIDER`
  - `APP_PUBLIC_NAME`
  - `APP_PUBLIC_SUPPORT_PHONE`

## 3. CI/CD Flow

Pipeline order:

1. Install dependencies.
2. Lint/typecheck/test/build.
3. Run Prisma migration in deploy mode.
4. Deploy API + runner.
5. Trigger scheduler.
6. Run smoke tests.

Reference commands:

```bash
pnpm install --frozen-lockfile
pnpm -C apps/api lint
pnpm -C apps/api typecheck
pnpm -C apps/api test
pnpm -C apps/api build
pnpm -C apps/api prisma migrate deploy
pnpm -C apps/api prisma generate
```

Important:

- Use `prisma migrate deploy` in staging/prod.
- Do **not** use `prisma migrate dev` outside local development.

## 4. Release Commands (Manual Fallback)

From repo root:

```bash
pnpm install --frozen-lockfile
pnpm -C apps/api build
pnpm -C apps/api prisma migrate deploy
pnpm -C apps/api prisma generate
```

Start processes:

```bash
# API
pnpm -C apps/api start

# Runner (separate process/container)
pnpm -C apps/api jobs:runner
```

Scheduler (daily):

```bash
# run once for "today"
pnpm -C apps/api jobs:schedule

# run for explicit date (UTC day key)
pnpm -C apps/api jobs:schedule 2026-02-12
```

## 5. Post-Deploy Smoke Tests

Use a valid admin token for admin routes.

```bash

# public health (no auth)
curl -i http://<api-host>/health

# prefixed health remains available behind API prefix only if configured as such
# admin health (auth required)
curl -i http://<api-host>/api/v1/admin/health -H "Authorization: Bearer <admin_access_token>"
```

## 6. Local Prod-like Compose

Use this to simulate production wiring (postgres + redis + api + admin):

```bash
docker compose -f docker-compose.prod-like.yml up --build
```

Services:

- API: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## 7. Monitoring and Ops

Key endpoints:

- `GET /api/v1/health`
- `GET /api/v1/admin/health`
- `GET /api/v1/admin/jobs`
- `POST /api/v1/admin/jobs/:id/retry`

What to watch:

- API error rates (4xx/5xx)
- Redis connectivity (rate limits + job locks)
- Job queue growth (`PENDING`, `FAILED`, `DEAD`)
- `JOB_DEAD_LETTERED` and `JOB_RETRIED` audit events

## 8. Backup and Recovery

Database:

- Daily full Postgres backups + WAL/point-in-time strategy.
- Keep backup retention by policy (for example 7/30/90 days).

Redis:

- Redis is operational cache/lock state; persist if desired, but treat as rebuildable.

Recovery expectation:

1. Restore Postgres from latest valid backup.
2. Re-deploy app at matching schema version.
3. Run `prisma migrate deploy` (idempotent).
4. Validate `health` and `admin/health`.
5. Re-run scheduler for missed days (idempotent keys prevent duplicates).

## 9. Deployment Options

### Option A: VPS + Docker Compose

- Run `api`, `jobs-runner`, `jobs-scheduler`, `postgres`, `redis` as separate services.
- Use reverse proxy (Nginx/Caddy) with TLS.
- Keep scheduler as cron-triggered command/service.

### Option B: Managed Platform

- API as web service/container.
- Runner as worker process.
- Scheduler as cron/scheduled job calling `jobs:schedule`.
- Use managed Postgres + managed Redis.

## 10. Operational Checklists

Pre-deploy:

- Confirm env vars are present and valid.
- Confirm DB backup succeeded in last 24h.
- Confirm migrations reviewed.

Deploy:

- Run build/test gates.
- Run `prisma migrate deploy`.
- Roll API and runner.
- Trigger scheduler.

Post-deploy:

- Run smoke tests.
- Verify logs/metrics for 15–30 min.
- Verify no unexpected `DEAD` jobs.

## 10. Incident Response Basics

If API degraded:

1. Check `admin/health` (DB/Redis status).
2. Check latest deploy and migration history.
3. Roll back app version if needed (DB-safe only).

If jobs stuck/failing:

1. Inspect `GET /admin/jobs?status=FAILED` and `status=DEAD`.
2. Fix root cause.
3. Retry with `POST /admin/jobs/:id/retry`.
4. Re-run scheduler for missed dates.
