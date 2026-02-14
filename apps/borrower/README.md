# Borrower Web App

Tenant-aware borrower app (MVP) under `/l/[slug]/*`.

## Run

```bash
pnpm -C apps/borrower dev
```

App runs on `http://localhost:3002`.

## Env

Copy `.env.example` and set:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`

## Happy Path

1. Open `http://localhost:3002/l/default`
2. Login at `/l/default/login` (OTP flow)
3. Complete profile at `/l/default/profile`
4. Apply at `/l/default/apply`
5. View/accept offer at `/l/default/offer`
6. View schedule at `/l/default/loan`
7. Initialize repayment at `/l/default/repay`
