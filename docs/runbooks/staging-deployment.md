# Staging Deployment Runbook

## Purpose

Staging should mirror production behavior as closely as possible:

- separate API + jobs runner processes
- Redis enabled
- scheduler command enabled
- `NODE_ENV=production` recommended for realistic behavior

## Deploy Steps

```bash
cd /path/to/repo
pnpm install --frozen-lockfile
pnpm -C apps/api lint
pnpm -C apps/api typecheck
pnpm -C apps/api test
pnpm -C apps/api build
pnpm -C apps/api prisma migrate deploy
pnpm -C apps/api prisma generate
```

Start:

```bash
pnpm -C apps/api start
pnpm -C apps/api jobs:runner
pnpm -C apps/api jobs:schedule
```

## Staging Environment Checklist

- `CORS_ALLOWED_ORIGINS` restricted to staging frontend domains.
- `PAYSTACK_DISABLE_SIGNATURE_VERIFY=false` unless explicitly testing webhook bypass.
- `NOTIFICATIONS_ENABLED` as required (usually `true` with `DEV_SINK`).
- Staging secrets separate from production.

## Validation

```bash
BASE="https://<staging-host>/api/v1"
curl -i "$BASE/health"
curl -i "$BASE/admin/health" -H "Authorization: Bearer <admin_access_token>"
curl -i "$BASE/admin/jobs?limit=10" -H "Authorization: Bearer <admin_access_token>"
```

Expected:

- API healthy
- DB + Redis up
- jobs visible and processable

