# LoanApp API Smoke Tests

Assumes API is running on `http://localhost:3000` with global prefix `/api/v1`.

## Environment (Hardening)

- `CORS_ORIGINS`: comma-separated origins/patterns for CORS (supports wildcard entries like `exp://*` and LAN CIDR-like forms such as `http://192.168.0.0/16`).
- `RATE_TTL`: window seconds for public endpoint rate limiting.
- `RATE_LIMIT`: max requests per window for public endpoint rate limiting.
- `DELINQUENCY_JOB_ENABLED`: set `false` to disable automatic delinquency recalculation job.
- `DELINQUENCY_JOB_CRON`: cron-like minute interval pattern, default `*/5 * * * *`.
- `PAYSTACK_SECRET_KEY`: Paystack secret key for initialize/verify calls.
- `PAYSTACK_PUBLIC_KEY`: optional, exposed only when needed by external clients.
- `PAYSTACK_WEBHOOK_SECRET`: HMAC secret for webhook signature validation.

## 1) Resolve tenant

```bash
curl "http://localhost:3000/api/v1/tenants/resolve?slug=demo&lenderTitle=Demo"
```

Expected: `200` with `tenantId`, `slug`, `name`.

## Tenant Isolation Rules

- Tenant context is derived from JWT (`req.user.tenantId`) only.
- Tenant-scoped protected endpoints do not accept tenant override headers.
- `/tenants/resolve` remains public for tenant selection/validation before authentication.
- Cross-tenant record access returns `404` (not `403`) to avoid existence disclosure.
- Service-layer tenant assertions (`assertTenantMatch`) are used on critical read/write paths.
- API responses scrub `tenantId` and internal-only fields via a global response interceptor.

## Money + Pricing Conventions

- Loan product money fields use integer minor units (`kobo`) end-to-end.
- Percentage values use basis points (`bps`): `100 = 1.00%`, `2400 = 24.00%`.
- Offer computation uses integer math and deterministic rounding; any remainder is absorbed by the last installment.

## 2) Create loan application (JWT / lender context)

```bash
curl -X POST "http://localhost:3000/api/v1/loan-applications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <BORROWER_ACCESS_TOKEN>" \
  -d '{
    "fullName": "Ada Okafor",
    "phone": "+2348012345678",
    "amount": 250000,
    "tenorMonths": 6,
    "purpose": "Business expansion"
  }'
```

Expected: `200` with `id`, `status`, `createdAt`.

## 3) Fetch by id (JWT scoped)

```bash
curl "http://localhost:3000/api/v1/loan-applications/<APPLICATION_ID>" \
  -H "Authorization: Bearer <BORROWER_ACCESS_TOKEN>"
```

Expected: `200` with full loan application details.

## 4) Admin list (JWT-only)

```bash
curl "http://localhost:3000/api/v1/admin/loan-applications?status=SUBMITTED" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Expected: `200` with tenant-scoped results for the JWT tenant.

## Loan Application Lifecycle

- Statuses: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `REQUESTED_DOCUMENTS`, `APPROVED`, `READY_FOR_DISBURSEMENT`, `DISBURSED`, `REPAID`, `DEFAULTED`, `REJECTED`.
- Transition endpoint: `POST /api/v1/loan-applications/:id/transition` (Bearer token required).
- Compatibility endpoint remains for admin: `PATCH /api/v1/admin/loan-applications/:id/status` (`APPROVED`/`REJECTED` only), implemented using the same transition service.

## 5) Cross-tenant access is blocked

```bash
curl "http://localhost:3000/api/v1/admin/loan-applications/<APPLICATION_FROM_OTHER_TENANT>" \
  -H "Authorization: Bearer <TENANT_A_ADMIN_TOKEN>"
```

Expected: `404` (record hidden by tenant scope).

## 6) Health check

```bash
curl "http://localhost:3000/health"
```

Expected: `200`.

## 6b) Loan products (tenant admin)

```bash
curl -X POST "http://localhost:3000/api/v1/loan-products" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Weekly Standard",
    "currency":"NGN",
    "minPrincipal":10000,
    "maxPrincipal":500000,
    "minTenorDays":7,
    "maxTenorDays":90,
    "interestType":"FLAT",
    "interestRateBps":2400,
    "repaymentFrequency":"WEEKLY",
    "graceDays":0,
    "allowEarlyRepayment":true
  }'
```

Then compute:

```bash
curl -X POST "http://localhost:3000/api/v1/loan-products/<PRODUCT_ID>/compute-offer" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"principalMinor":100000,"tenorDays":30}'
```

## 7) Public rate limiting check

```bash
for i in {1..130}; do
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/v1/tenants/resolve?slug=demo"
done
```

Expected: once the configured limit is exceeded, responses become `429`.

## 8) Audit row verification (Postgres)

```bash
docker compose exec db psql -U postgres -d loanapp -c \
"SELECT action, \"tenantId\", \"actorType\", entity, \"entityId\", \"createdAt\" FROM \"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 20;"
```

Expected: rows such as `TENANT_RESOLVE`, `LOAN_APPLICATION_SUBMITTED`, `ADMIN_LOGIN`.

## 9) Generate repayment schedule (admin, DISBURSED loan)

```bash
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/generate-schedule" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"interestMethod":"REDUCING_BALANCE"}'
```

List schedule:

```bash
curl "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/schedule" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

## 10) Post repayment (admin)

```bash
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/repayments" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 15000,
    "channel": "MANUAL",
    "reference": "manual-cash-001"
  }'
```

List repayments:

```bash
curl "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/repayments" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Manual delinquency recalculation:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/recalc-delinquency" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Collections queue:

```bash
curl "http://localhost:3000/api/v1/admin/collections/queue?bucket=DPD_1_30" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

## 11) Disbursement Engine (tenant admin)

Mark loan ready:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/ready-for-disbursement" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Process disbursement:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/disburse" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"method":"BANK_TRANSFER","idempotencyKey":"loan:<LOAN_ID>:disburse:v1"}'
```

List disbursements:

```bash
curl "http://localhost:3000/api/v1/admin/disbursements?status=FAILED" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Retry failed disbursement:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/disbursements/<DISBURSEMENT_ID>/retry" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Reverse successful disbursement:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/disbursements/<DISBURSEMENT_ID>/reverse" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"duplicate payout"}'
```

Idempotency:
- `idempotencyKey` is unique per tenant.
- Reusing the same key for a different loan returns `409`.

## 12) Ledger adjustment (OPS/SUPER_ADMIN)

```bash
curl -X POST "http://localhost:3000/api/v1/admin/ledger/adjustments" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "memo":"manual correction",
    "idempotencyKey":"adj:loan:<LOAN_ID>:001",
    "loanApplicationId":"<LOAN_ID>",
    "lines":[
      {"accountCode":"CASH_ON_HAND","direction":"DEBIT","amount":1000},
      {"accountCode":"SUSPENSE","direction":"CREDIT","amount":1000}
    ]
  }'
```

## 13) Payment intents (Paystack-first)

Initialize inbound collection:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/inbound/init" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "loanId":"<LOAN_ID>",
    "amountMinor":1500000,
    "currency":"NGN",
    "idempotencyKey":"loan:<LOAN_ID>:collection:001"
  }'
```

Initialize outbound payout:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/outbound/init" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "disbursementId":"<DISBURSEMENT_ID>",
    "amountMinor":2500000,
    "currency":"NGN",
    "recipientCode":"RCP_xxxxx",
    "idempotencyKey":"disbursement:<DISBURSEMENT_ID>:payout:001"
  }'
```

Verify intent (posts ledger on first verified success only):

```bash
curl -X POST "http://localhost:3000/api/v1/admin/payments/<INTENT_ID>/verify" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Webhook callback:

```bash
curl -X POST "http://localhost:3000/api/v1/payments/webhooks/paystack" \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: <computed_sha512_hmac>" \
  -d '{"event":"charge.success","data":{"id":1234,"reference":"pi_..."}}'
```

## 14) Reconciliation + settlement monitoring

Run reconciliation:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/reconciliation/runs" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"PAYMENT","days":7}'
```

List runs:

```bash
curl "http://localhost:3000/api/v1/admin/reconciliation/runs?type=PAYMENT&status=COMPLETED&limit=20" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Get run with issues:

```bash
curl "http://localhost:3000/api/v1/admin/reconciliation/runs/<RUN_ID>" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

List issues (OPEN by default in UI):

```bash
curl "http://localhost:3000/api/v1/admin/reconciliation/issues?status=OPEN&severity=HIGH" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Update issue workflow:

```bash
curl -X PATCH "http://localhost:3000/api/v1/admin/reconciliation/issues/<ISSUE_ID>" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACKNOWLEDGED","note":"Investigating with provider"}'
```

Production hardening workflow (records + settlement batches + resolve):

```bash
# 1) Run hardened job for exact date window (idempotent by tenant+provider+window)
curl -X POST "http://localhost:3000/api/v1/admin/reconciliation/jobs/run" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"provider":"PAYSTACK","dateFrom":"2026-02-18T00:00:00.000Z","dateTo":"2026-02-19T00:00:00.000Z"}'

# 2) List records by status
curl "http://localhost:3000/api/v1/admin/reconciliation?status=SUSPENSE&limit=50" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# 3) Resolve a mismatch/suspense record
curl -X POST "http://localhost:3000/api/v1/admin/reconciliation/<RECON_RECORD_ID>/resolve" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"resolutionType":"MANUAL_ADJUSTMENT","note":"Matched to delayed internal posting"}'

# 4) Optional write-off resolution (SUPER_ADMIN only)
curl -X POST "http://localhost:3000/api/v1/admin/reconciliation/<RECON_RECORD_ID>/resolve" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"resolutionType":"WRITE_OFF","note":"Provider confirmed unrecoverable"}'

# 5) Create/open settlement batch for provider+date
curl -X POST "http://localhost:3000/api/v1/admin/reconciliation/settlement-batches" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"provider":"PAYSTACK","settlementDate":"2026-02-19T00:00:00.000Z","currency":"NGN"}'

# 6) Close batch (SUPER_ADMIN only); closed batches reject record modifications
curl -X POST "http://localhost:3000/api/v1/admin/reconciliation/settlement-batches/<BATCH_ID>/close" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Operational notes:
- `RECONCILIATION_JOB_ENABLED=true|false` toggles automated nightly execution.
- `RECONCILIATION_JOB_INTERVAL_MS` controls interval duration for the in-process scheduler.
- Suspense handling posts a balanced ledger adjustment (`BANK_CLEARING` debit, `SUSPENSE` credit) only when provider payment cannot be matched internally.
- All reconciliation status changes create resolution history rows and audit log entries.

## 15) Collections & arrears management

Run collections scan (idempotent):

```bash
curl -X POST "http://localhost:3000/api/v1/admin/collections/run" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

List collections cases:

```bash
curl "http://localhost:3000/api/v1/admin/collections/cases?status=OPEN&stage=SOFT&limit=50" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Get case detail:

```bash
curl "http://localhost:3000/api/v1/admin/collections/cases/<CASE_ID>" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Add case action:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/collections/cases/<CASE_ID>/action" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"CALL","note":"Spoke with borrower"}'
```

Set promise-to-pay:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/collections/cases/<CASE_ID>/promise-to-pay" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"promiseToPayAt":"2026-02-21T12:00:00.000Z","note":"Borrower promised transfer"}'
```

Pause/waive penalties:

```bash
curl -X POST "http://localhost:3000/api/v1/admin/loans/<LOAN_ACCOUNT_ID>/penalty/pause" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"isPaused":true,"note":"Dispute in progress"}'

curl -X POST "http://localhost:3000/api/v1/admin/loans/<LOAN_ACCOUNT_ID>/penalty/waive" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"amount":1500,"note":"Approved hardship waiver"}'
```

## Penalty Accrual Canonical Model

- Canonical model: `TenantPenaltyAccrual` (tenant collections engine).
- Legacy model: `PenaltyAccrual` (lender-loan flow) is deprecated.
- Legacy penalty writes are disabled by default; enable only if needed with:
  - `ENABLE_LEGACY_PENALTY_ACCRUAL=true`

## Ledger Engine (tenant-isolated)

All ledger APIs are under `/api/v1/admin/ledger` and require `Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>`.

```bash
# List chart of accounts with balances
curl "http://localhost:3000/api/v1/admin/ledger/accounts" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Trial balance
curl "http://localhost:3000/api/v1/admin/ledger/trial-balance?asOf=2026-02-19T23:59:59.000Z" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Entries list
curl "http://localhost:3000/api/v1/admin/ledger/entries?referenceType=LoanApplication&limit=50&offset=0" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Reverse an entry (immutable journals + reversal only)
curl -X PATCH "http://localhost:3000/api/v1/admin/ledger/entries/<ENTRY_ID>/reverse" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"manual correction"}'
```

## Risk Engine

Risk APIs are tenant-isolated and require `Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>`.

```bash
# Get risk snapshot + active holds + latest history
curl "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/risk" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Add hold
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/holds" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"MANUAL_REVIEW","note":"Name mismatch in uploaded docs"}'

# Resolve hold
curl -X POST "http://localhost:3000/api/v1/admin/holds/<HOLD_ID>/resolve" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"resolutionNote":"KYC corrected and verified"}'

# Override to PASS (RISK_MANAGER / SUPER_ADMIN only)
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/risk/override" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"note":"Manual override after enhanced due diligence"}'
```

Behavior:
- Risk evaluations are immutable (`RiskEvaluation`) and store the full input snapshot + reasons.
- On `SUBMITTED -> UNDER_REVIEW`, the engine auto-runs with trigger `AUTO_ON_SUBMISSION`.
- Active holds block approval/disbursement transitions unless manual override exists.

## Risk & Scoring Engine

```bash
# List policies (tenant-scoped)
curl "http://localhost:3000/api/v1/admin/risk/policies" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Create new policy version
curl -X POST "http://localhost:3000/api/v1/admin/risk/policies" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"default","configJson":{"weights":{"employmentStatusWeight":20,"incomeBandWeight":20,"repaymentHistoryWeight":25,"deviceTrustWeight":10,"kycLevelWeight":25},"thresholds":{"approveMinScore":700,"reviewMinScore":550},"rules":{"hardDeclines":[],"softFlags":[]}}}'

# Activate policy version
curl -X POST "http://localhost:3000/api/v1/admin/risk/policies/<POLICY_ID>/activate" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Manual evaluate one application
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/risk-evaluate" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# List evaluations
curl "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/risk-evaluations" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

RBAC:
- Run evaluation: `CREDIT_OFFICER`, `RISK_MANAGER`, `SUPER_ADMIN`
- Manage policies and override routing: `RISK_MANAGER`, `SUPER_ADMIN`

## Credit Decision Orchestrator

```bash
# Run deterministic decision + lifecycle transition
curl -X POST "http://localhost:3000/api/v1/admin/loan-applications/<LOAN_ID>/decide" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

Decision policy fields (`LoanDecisionPolicy`):
- `approveThreshold`
- `manualReviewMin`
- `maxExposure`
- `hardBlockFlags`
- `allowUnderReviewReeval`

Reason codes:
- `MISSING_RISK_DATA`
- `HARD_BLOCK_FLAG`
- `FLAGGED_BY_HARD_BLOCK_POLICY`
- `RISK_SCORE_BELOW_MANUAL_REVIEW_MIN`
- `EXPOSURE_LIMIT_EXCEEDED`
- `RISK_SCORE_ABOVE_APPROVE_THRESHOLD`
- `RISK_SCORE_IN_MANUAL_REVIEW_BAND`

## Financial Integrity Reports

Tenant-admin reporting endpoints (JWT tenant-scoped, no tenant header):

```bash
# Portfolio summary
curl "http://localhost:3000/api/v1/admin/reports/portfolio-summary" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Aging buckets
curl "http://localhost:3000/api/v1/admin/reports/aging" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Loan sub-ledger
curl "http://localhost:3000/api/v1/admin/reports/loan/<LOAN_ID>/ledger" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Revenue components
curl "http://localhost:3000/api/v1/admin/reports/revenue?from=2026-02-01&to=2026-02-29" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Denormalized-vs-ledger reconciliation
curl "http://localhost:3000/api/v1/admin/reports/reconcile" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

## Compliance & Integrity Hardening

- Tenant audit endpoint (roles: `SUPER_ADMIN`, `OPS`, `RISK_MANAGER`):

```bash
curl "http://localhost:3000/api/v1/admin/audit?limit=100" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

- Money-moving operations should provide an idempotency key:

```http
Idempotency-Key: disbursement:<loanId>:<unique-suffix>
```

- Silent loan status mutation is forbidden for non-system actors; use transition endpoints/services so status history and audit rows are always written.

## Monitoring, Observability & Operational Controls

- Tenant operational metrics (SUPER_ADMIN only):

```bash
curl "http://localhost:3000/api/v1/admin/metrics" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

- Tenant system status (SUPER_ADMIN only):

```bash
curl "http://localhost:3000/api/v1/admin/system-status" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

- `GET /health` now includes operational checks:
  - pending disbursements
  - stuck idempotency transitions (>10 minutes pending)
  - paused interest count
  - ledger imbalance count

- Feature flags (`FeatureFlag` table, unique by `tenantId + key`):
  - `AUTO_APPROVAL`
  - `AUTO_DISBURSE`
  - `INTEREST_ACCRUAL`
- `COLLECTIONS_AUTOMATION`

## Observability Pack

- Request correlation:
  - Every API response includes `X-Request-Id`.
  - API logs include `requestId`, `tenantId`, `actorType`, `actorId`, and `actorRole`.
  - Use the `requestId` from UI/API errors to trace server logs quickly.

- Prometheus metrics:
  - Endpoint: `GET /metrics`
  - Header required: `x-metrics-token: <METRICS_TOKEN>`
  - Exposed metrics:
    - `http_requests_total`
    - `http_request_duration_ms` (histogram buckets)
    - `db_query_errors_total`
    - `loan_transitions_total`

```bash
curl "http://localhost:3000/metrics" \
  -H "x-metrics-token: <METRICS_TOKEN>"
```

- Sentry:
  - API uses `SENTRY_DSN` (if set).
  - Admin uses `NEXT_PUBLIC_SENTRY_DSN` (if set).
  - Captured errors are tagged with request/tenant context where available.

## Admin Audit Explorer (tenant scoped)

```bash
# List with strong filters
curl "http://localhost:3000/api/v1/admin/audits?page=1&pageSize=25&sort=-createdAt&status=SUCCESS&q=DISBURSEMENT" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Detail
curl "http://localhost:3000/api/v1/admin/audits/<AUDIT_ID>" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# CSV export (max 10k rows, CSV injection protected)
curl "http://localhost:3000/api/v1/admin/audits/export.csv?from=2026-02-01T00:00:00.000Z&to=2026-02-28T23:59:59.000Z" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -o audit_export.csv
```

## Notifications Engine

- Notification records are stored in `Notification` and queued via `NotificationOutbox`.
- Triggered automatically on:
  - loan lifecycle transition (`LOAN_STATUS_CHANGED`)
  - repayment posting (`REPAYMENT_RECEIVED`, `REPAYMENT_RECEIVED_ADMIN`)
  - disbursement success (`DISBURSED`, `DISBURSED_ADMIN`)
- Endpoints:
  - `GET /api/v1/notifications`
  - `POST /api/v1/notifications/:id/read`
  - `GET /api/v1/admin/notifications`
  - `POST /api/v1/admin/notifications/:id/read`
- Outbox worker:
  - runs automatically in `development`
  - enable explicitly with `ENABLE_OUTBOX_WORKER=true`
  - poll interval controlled by `OUTBOX_WORKER_INTERVAL_MS`

## Borrower Hardship & Restructure

Borrower endpoints (JWT borrower):

```bash
# Create hardship request
curl -X POST "http://localhost:3000/api/v1/hardship" \
  -H "Authorization: Bearer <BORROWER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"loanApplicationId":"<LOAN_ID>","type":"PAYMENT_PAUSE","reason":"Income disruption","pauseDays":14}'

# List own hardship requests
curl "http://localhost:3000/api/v1/hardship?page=1&limit=25" \
  -H "Authorization: Bearer <BORROWER_ACCESS_TOKEN>"

# Get request detail
curl "http://localhost:3000/api/v1/hardship/<HARDSHIP_ID>" \
  -H "Authorization: Bearer <BORROWER_ACCESS_TOKEN>"
```

Admin endpoints (JWT tenant admin):

```bash
# List tenant hardship requests
curl "http://localhost:3000/api/v1/admin/hardship?status=REQUESTED&page=1&pageSize=25" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Transition request
curl -X POST "http://localhost:3000/api/v1/admin/hardship/<HARDSHIP_ID>/transition" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"toStatus":"UNDER_REVIEW","decisionNotes":"Queued for risk review"}'
```

Approval behavior:
- `PAYMENT_PAUSE`: sets `interestAccrualPaused` + `interestPausedUntil`.
- `TENOR_EXTENSION`: regenerates unpaid schedule safely.
- `RATE_REDUCTION`: updates rate and regenerates future schedule only.

## Case Management (Complaints / Disputes / Requests)

- Endpoints are tenant-scoped and require admin bearer auth:
  - `POST /api/v1/admin/cases`
  - `GET /api/v1/admin/cases`
  - `GET /api/v1/admin/cases/:id`
  - `POST /api/v1/admin/cases/:id/messages`
  - `POST /api/v1/admin/cases/:id/assign`
  - `POST /api/v1/admin/cases/:id/transition`
- Borrower read-only endpoints:
  - `GET /api/v1/cases`
  - `GET /api/v1/cases/:id`
  - Borrower endpoints always exclude `INTERNAL` case messages.
- SLA due date is auto-calculated on creation:
  - `LOW`: +7 days
  - `MEDIUM`: +3 days
  - `HIGH`: +24 hours
  - `URGENT`: +6 hours
- Overdue notifier runs every 5 minutes and creates deduplicated `CASE_OVERDUE` notifications.
- Case transitions are validated server-side and recorded in `CaseStatusHistory` with audit logs.

## Background Worker + Persistent Job Queue

Queue storage is Postgres via Prisma `Job` table (no Redis/BullMQ dependency).

1. Apply DB changes:

```bash
pnpm -C apps/api prisma:migrate:dev --name job-queue-enterprise
pnpm -C apps/api prisma:generate
```

2. Run API and worker:

```bash
pnpm api:dev
pnpm worker:dev
```

Or run both:

```bash
pnpm dev:all
```

Worker runtime env vars:
- `WORKER_ID` (default random worker id)
- `WORKER_CONCURRENCY` (default `3`)
- `WORKER_POLL_MS` (default `1000`)

Admin observability:
- List jobs: `GET /api/v1/admin/jobs`
- Job details: `GET /api/v1/admin/jobs/:id`
- Admin UI routes:
  - `/dashboard/jobs`
  - `/dashboard/jobs/:id`

## Enterprise Observability + Ops Controls

- API health: `GET /health`
  - includes `status`, `version`, `uptimeSec`, `database`, `queue`, and `operations` summary
- API metrics: `GET /metrics`
  - Prometheus text format
  - protected only when `METRICS_TOKEN` is set (`x-metrics-token` header)
  - disable with `METRICS_ENABLED=false`
- Worker health/metrics:
  - `GET http://localhost:${WORKER_PORT:-3005}/health`
  - `GET http://localhost:${WORKER_PORT:-3005}/metrics`
  - set `WORKER_PORT` and `METRICS_ENABLED` in environment

Admin ops API (strict roles: `SUPER_ADMIN`, `SYSTEM`):
- `GET /api/v1/admin/ops/jobs`
- `GET /api/v1/admin/ops/jobs/:id`
- `POST /api/v1/admin/ops/jobs/:id/retry`
- `GET /api/v1/admin/ops/dlq`

Retry safeguards:
- Retry allowed only for failed/dead-letter jobs.
- API-side throttle: max 1 retry request per minute per job.
- Audit event emitted: `JOB_RETRY_REQUESTED`.

## Executive Portfolio Intelligence

Tenant-scoped executive metrics endpoints (JWT tenant context only):

```bash
# KPI snapshot
curl "http://localhost:3000/api/v1/admin/portfolio/kpis" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"

# Trend series
curl "http://localhost:3000/api/v1/admin/portfolio/trends?days=30" \
  -H "Authorization: Bearer <TENANT_ADMIN_ACCESS_TOKEN>"
```

KPI definition notes:
- `totalDisbursed`: sum of successful tenant disbursements.
- `totalRepaid`: sum of tenant loan repayments posted.
- `totalPrincipalOutstanding`: sum of `outstandingPrincipal` across outstanding loans.
- `totalInterestAccrued`: `outstandingInterest + interestPaid` from repayment schedule aggregates.
- `overdueAmount`: unpaid amount on past-due schedule items (`totalDue - totalPaid`).
- `par30Amount` / `par90Amount`: outstanding principal with `daysPastDue >= 30` / `>= 90`.
- `par30Rate` / `par90Rate`: PAR amount divided by total principal outstanding.
- `defaultRate`: outstanding principal in default cohort (`DEFAULTED/WRITTEN_OFF` or `DPD >= 90`) over total principal outstanding.
- `recoveryRate`: repayments posted after default event divided by defaulted principal.
- `avgDaysPastDue`: average DPD across delinquent loans.

## Portfolio Intelligence Layer v2

Additional tenant-scoped analytics endpoints:

- `GET /api/v1/admin/portfolio/summary`
- `GET /api/v1/admin/portfolio/par`
- `GET /api/v1/admin/portfolio/delinquency`
- `GET /api/v1/admin/portfolio/vintage?months=6`
- `GET /api/v1/admin/portfolio/collections?days=30`
- `GET /api/v1/admin/portfolio/treasury`

Daily aggregation:

- `PortfolioDailySnapshot` stores daily rollups per tenant.
- Recompute endpoint (SUPER_ADMIN only):
  - `POST /api/v1/admin/portfolio/recompute?days=30`
- Worker env toggles:
  - `PORTFOLIO_SNAPSHOT_JOB_ENABLED=true`
  - `PORTFOLIO_SNAPSHOT_JOB_INTERVAL_MS=86400000`

Definitions:

- `DPD`: days since earliest unpaid installment due date (`LoanRepaymentScheduleItem`) for active loans.
- `PAR_30`: outstanding exposure where `DPD >= 30`.
- `PAR_90` / NPL: outstanding exposure where `DPD >= 90`.

## Paystack Payments Integration

Environment (API):
- `PAYMENTS_PROVIDER=paystack`
- `PAYSTACK_BASE_URL=https://api.paystack.co`
- `PAYSTACK_SECRET_KEY=<secret>`
- `PAYSTACK_WEBHOOK_SECRET=<secret>`
- `PAYMENTS_RECONCILIATION_JOB_ENABLED=true`
- `PAYMENTS_RECONCILIATION_JOB_INTERVAL_MS=300000`
- `PAYMENTS_RECONCILIATION_STALE_MINUTES=15`
- `PAYMENTS_RECONCILIATION_BATCH_SIZE=50`

Key endpoints:
- Borrower:
  - `POST /api/v1/repayments/initialize`
  - `POST /api/v1/repayments/verify`
- Admin:
  - `POST /api/v1/admin/disbursements/recipient`
  - `POST /api/v1/admin/disbursements/initiate`
  - `POST /api/v1/admin/disbursements/verify`
- Webhooks:
  - `POST /api/v1/webhooks/payments` (Paystack-first normalized webhook route)
  - `POST /api/v1/payments/webhooks/paystack` (legacy route retained)

Local webhook test (ngrok):
```bash
# start api
pnpm -C apps/api start:dev

# expose local api
ngrok http 3000

# configure Paystack webhook URL
# https://<ngrok-id>.ngrok-free.app/api/v1/webhooks/payments
```

## External Integrations Layer

Provider-agnostic integrations are exposed through:

- `POST /api/v1/admin/integrations/payments/repayments/init`
- `POST /api/v1/admin/integrations/payments/disbursements/init`
- `GET /api/v1/admin/integrations/payments/transactions`
- `GET /api/v1/admin/integrations/webhooks`

Public webhook entrypoint:

- `POST /api/v1/webhooks/paystack`

Behavior:

- webhook signature is validated using `x-paystack-signature`
- event payloads are persisted in `WebhookEvent`
- valid events are queued as `PROCESS_WEBHOOK_EVENT` jobs
- webhook processing is idempotent through provider event IDs and payment state guards
- payment settlement notifications are emitted only after successful state finalization

## Event-Driven Outbox (Redis Streams)

Domain events are persisted transactionally in `OutboxEvent` and dispatched to Redis Streams.

Environment:
- `OUTBOX_STREAM=loanapp:domain-events`
- `OUTBOX_POLL_MS=1000`
- `OUTBOX_BATCH_SIZE=50`
- `OUTBOX_MAX_ATTEMPTS=25`
- `READ_MODEL_ENABLED=true`

Core components:
- Transactional outbox writer: `OutboxService`
- Dispatcher worker: `OutboxDispatcherWorker`
- Consumer framework: `StreamConsumerRunner`
- Read-model consumer: `readmodel-loanapps` (writes `LoanApplicationReadModel`)

Published event types (v1):
- `loan_application.submitted`
- `loan_application.status_transitioned`
- `disbursement.completed`
- `repayment.posted`
- `collections.escalated`

## Job Retry + DLQ

Background jobs use persistent retries and dead-letter handling:

- Retries: exponential backoff with jitter (capped).
- Exhausted jobs are moved to `DEAD_LETTER` and mirrored into `JobDlq`.
- Tenant-safe admin endpoints:
  - `GET /api/v1/admin/jobs`
  - `GET /api/v1/admin/jobs/:id`
  - `POST /api/v1/admin/jobs/:id/retry`
  - `POST /api/v1/admin/jobs/:id/cancel`

Health includes job stats:
- `pendingDue`
- `processing`
- `dlqLast24h`

## Financial Integrity Guarantees

The API enforces bank-grade financial guardrails:

- Double-entry validation: every ledger post must balance debits and credits.
- Immutable ledger: update/delete mutations on ledger rows are blocked (append-only).
- Lifecycle invariants:
  - loan balances cannot go negative
  - repayments cannot exceed scheduled due totals
  - disbursement amounts cannot exceed approved amounts
  - orphan tenant ledger entries are flagged
  - `PaymentIntent` cannot move from `SUCCEEDED -> PENDING`
  - `PayoutIntent` cannot move from `SUCCEEDED -> PROCESSING`

Background integrity scan:

- Job runs every 10 minutes (configurable):
  - `INTEGRITY_SCAN_JOB_ENABLED=true`
  - `INTEGRITY_SCAN_JOB_INTERVAL_MS=600000`
- Persists tenant snapshots to `SystemIntegritySnapshot`.

Admin monitoring endpoint:

- `GET /api/v1/admin/system/integrity` (SUPER_ADMIN only)
- Returns latest snapshot status, checked timestamp, and failure counts.
