# LoanApp Admin (apps/admin)

## Setup
1. Copy env file:
   - `cp apps/admin/.env.example apps/admin/.env.local`
2. Ensure API base URL is set in `apps/admin/.env.local`:
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`
3. Install dependencies from repo root:
   - `pnpm install`
4. If env values were changed while dev server was running, clear cache before restart:
   - delete `apps/admin/.next`

## Run
- From repo root:
  - `pnpm -C apps/admin dev`
- Open:
  - `http://localhost:3001` (or Next.js printed port)

## Auth Flow (MVP)
- `GET /login` for admin login
- `GET /setup-password?token=...` for invite password setup
- Protected pages require auth cookie via middleware
- Logout:
  - top-right account menu or `/logout`
- Session bootstrap:
  - frontend calls `/api/proxy/admin/me` via `useMe()`

## Backend Requirements
- API running at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3000`)
- Admin auth endpoints available:
  - `/api/v1/admin/auth/login`
  - `/api/v1/admin/auth/setup-password`
  - `/api/v1/admin/auth/refresh`
  - `/api/v1/admin/auth/logout`
- Reports summary endpoint:
  - `/api/v1/admin/reports/summary`
 - Admin me endpoint:
   - `/api/v1/admin/me`

## Notes
- Access/refresh tokens are stored as HttpOnly cookies by Next route handlers.
- Middleware attempts one refresh via `/api/auth/refresh` when access token is missing/expired.
- Dashboard data is fetched with React Query from Next proxy route `/api/proxy/admin/reports/summary`.
- Permissions are loaded from backend `/admin/me`.
- Every outbound API request includes `x-request-id`; failed requests show requestId in error messages for support/debugging.
- Optional Sentry client telemetry is enabled only when `NEXT_PUBLIC_SENTRY_DSN` is set.
- Background jobs visibility:
  - `/dashboard/jobs` shows tenant-scoped queue list
  - `/dashboard/jobs/:id` shows payload/error details
- Operations controls:
  - `/dashboard/operations` (SUPER_ADMIN or SYSTEM only)
  - supports failed/waiting/active/completed filters, job detail view, and safe retry action
