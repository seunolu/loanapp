# LoanApp API Smoke Tests

Assumes API is running on `http://localhost:3000` with global prefix `/api/v1`.

## 1) Resolve tenant

```bash
curl "http://localhost:3000/api/v1/tenants/resolve?slug=demo&lenderTitle=Demo"
```

Expected: `200` with `tenantId`, `slug`, `name`.

## 2) Create loan application

```bash
curl -X POST "http://localhost:3000/api/v1/loan-applications" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: <TENANT_ID_FROM_RESOLVE>" \
  -d '{
    "fullName": "Ada Okafor",
    "phone": "+2348012345678",
    "amount": 250000,
    "tenorMonths": 6,
    "purpose": "Business expansion"
  }'
```

Expected: `200` with `id`, `status`, `createdAt`.

## 3) Fetch by id

```bash
curl "http://localhost:3000/api/v1/loan-applications/<APPLICATION_ID>" \
  -H "x-tenant-id: <TENANT_ID_FROM_RESOLVE>"
```

Expected: `200` with full loan application details.

