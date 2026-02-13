# Admin Portal MVP Mapping (Source of Truth)

## Purpose
This document defines the Admin Portal MVP scope and maps each screen to:
- API dependencies
- Required permissions
- Acceptance criteria
- Definition of Done (DoD)

This is the build checklist to avoid product/API drift.

## MVP Scope Boundaries
## Must-Have (MVP)
- Admin authentication and session lifecycle
- Dashboard KPI visibility
- Borrower management (list/detail/note/override/risk)
- Underwriting case operations and checklist updates
- Loan application review (approve/reject + offer preview)
- Disbursement operations (initiate and status transitions)
- Audit log explorer and CSV export
- Jobs monitoring and retry
- Tenant lender settings (view/update own lender)
- Admin user and role assignment basics

## Later (Post-MVP)
- Rich charts and advanced BI visualizations
- Real-time notifications in portal
- Bulk actions for borrowers/applications
- Advanced search builder and saved filters
- Fine-grained custom role editor UI
- Multi-tenant platform onboarding UI
- Workflow automation and SLA escalations

## Navigation and Route Map
- `/login`
- `/setup-password`
- `/dashboard`
- `/borrowers`
- `/borrowers/:id`
- `/underwriting`
- `/underwriting/:applicationId`
- `/applications`
- `/applications/:id`
- `/disbursements`
- `/jobs`
- `/audit-logs`
- `/reports/summary`
- `/reports/portfolio`
- `/reports/collections`
- `/reports/par`
- `/settings/lender`
- `/settings/admin-users`
- `/settings/roles`
- `/platform/onboarding` (platform-only, non-MVP UI optional)

## Screen Mapping
## 1) Login (`/login`)
### APIs
- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/refresh`
- `POST /api/v1/admin/auth/logout`

### Permissions
- None for login endpoint

### Acceptance Criteria
- Valid credentials return admin tokens and admin summary
- Suspended or invalid admins are blocked with standard error envelope
- Token refresh rotates refresh token successfully

## 2) Setup Password (`/setup-password`)
### APIs
- `POST /api/v1/admin/auth/invite/validate`
- `POST /api/v1/admin/auth/setup-password`

### Permissions
- Invite token based (no prior session required)

### Acceptance Criteria
- Valid invite token can be validated
- Password setup is one-time and consumes token
- Expired/used token fails with standard error envelope

## 3) Dashboard (`/dashboard`)
### APIs
- `GET /api/v1/admin/reports/summary`
- `GET /api/v1/admin/health`

### Permissions
- `REPORTS_VIEW` for summary
- Admin-authenticated for health

### Acceptance Criteria
- Summary KPIs render successfully for current tenant
- Health status shows DB/Redis status

## 4) Borrowers List (`/borrowers`)
### APIs
- `GET /api/v1/admin/borrowers`

### Permissions
- Borrower read permission (role-mapped in backend)

### Acceptance Criteria
- Supports `limit` + `cursor` pagination
- Search by `query` works
- Tenant-scoped results only

## 5) Borrower Detail (`/borrowers/:id`)
### APIs
- `GET /api/v1/admin/borrowers/:id`
- `GET /api/v1/admin/borrowers/:id/risk`
- `POST /api/v1/admin/borrowers/:id/notes`
- `PUT /api/v1/admin/borrowers/:id/override`

### Permissions
- View borrower + risk permission for read
- Manage borrower permission for note/override writes

### Acceptance Criteria
- Detail data loads with borrower-scoped records
- Notes can be added and persist
- Overrides can be created/updated and reflect in loan validation behavior

## 6) Underwriting Queue (`/underwriting`)
### APIs
- `GET /api/v1/admin/underwriting/cases`

### Permissions
- Underwriting view permission

### Acceptance Criteria
- Cases list supports `limit` + `cursor` + `status` filters
- Tenant-scoped case listing

## 7) Underwriting Case (`/underwriting/:applicationId`)
### APIs
- `GET /api/v1/admin/underwriting/cases/:applicationId`
- `PATCH /api/v1/admin/underwriting/cases/:applicationId`
- `POST /api/v1/admin/underwriting/cases/:applicationId/checklist`

### Permissions
- Underwriting edit permission

### Acceptance Criteria
- Case fields can be updated
- Checklist bulk upsert works
- Approval gate dependency can be verified from this screen state

## 8) Applications Queue (`/applications`)
### APIs
- `GET /api/v1/admin/loans/applications`

### Permissions
- Loan review view permission

### Acceptance Criteria
- Status filtering and cursor pagination work
- List can drill to single application workflow

## 9) Application Decision (`/applications/:id`)
### APIs
- `POST /api/v1/admin/loans/applications/:id/offer/preview`
- `POST /api/v1/admin/loans/applications/:id/approve`
- `POST /api/v1/admin/loans/applications/:id/reject`

### Permissions
- Loan approve/reject permissions
- Pricing override restricted by backend role/permission policy

### Acceptance Criteria
- Offer preview renders calculated pricing/schedule
- Approve succeeds only when underwriting gate is satisfied
- Reject requires reason and persists decision

## 10) Disbursements (`/disbursements`)
### APIs
- `POST /api/v1/admin/disbursements`
- `POST /api/v1/admin/disbursements/:id/mark-processing`
- `POST /api/v1/admin/disbursements/:id/mark-succeeded`
- `POST /api/v1/admin/disbursements/:id/mark-failed`

### Permissions
- Disbursement manage permission

### Acceptance Criteria
- Disbursement initiation validates loan and bank account ownership rules
- Status transitions follow backend constraints
- Mark-succeeded supports idempotency key flow

## 11) Audit Logs (`/audit-logs`)
### APIs
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/audit-logs/export.csv`

### Permissions
- Audit read permission for listing
- Export permission/role restriction for CSV export

### Acceptance Criteria
- Filtered pagination works (`limit`, `cursor`, date range, action/actor/entity filters)
- CSV export enforces server-side range and row guardrails

## 12) Jobs (`/jobs`)
### APIs
- `GET /api/v1/admin/jobs`
- `POST /api/v1/admin/jobs/:id/retry`
- `GET /api/v1/admin/health`

### Permissions
- Jobs view permission
- Jobs retry permission

### Acceptance Criteria
- Jobs list supports cursor pagination + status filtering
- Retry action requeues eligible jobs only

## 13) Reports (`/reports/*`)
### APIs
- `GET /api/v1/admin/reports/summary`
- `GET /api/v1/admin/reports/portfolio`
- `GET /api/v1/admin/reports/collections`
- `GET /api/v1/admin/reports/par`

### Permissions
- `REPORTS_VIEW`

### Acceptance Criteria
- Required date filters for portfolio/collections are enforced by UI
- Returned metrics render with tenant-correct values

## 14) Lender Settings (`/settings/lender`)
### APIs
- `GET /api/v1/admin/lenders/me`
- `PATCH /api/v1/admin/lenders/me`

### Permissions
- Lender settings edit permission

### Acceptance Criteria
- Current lender settings load successfully
- Settings updates persist and reflect on next read

## 15) Admin Users (`/settings/admin-users`)
### APIs
- `GET /api/v1/admin/admin-users`
- `GET /api/v1/admin/admin-users/:id`
- `POST /api/v1/admin/admin-users`
- `PATCH /api/v1/admin/admin-users/:id/status`
- `POST /api/v1/admin/admin-users/:id/reset`

### Permissions
- `ADMIN_USERS_VIEW`
- `ADMIN_USERS_MANAGE`

### Acceptance Criteria
- Staff creation returns invite info
- Suspend/activate works and enforces backend safeguards
- Reset invite issues a fresh token flow

## 16) Roles (`/settings/roles`)
### APIs
- `GET /api/v1/admin/roles`
- `PUT /api/v1/admin/admin-users/:id/roles`

### Permissions
- Role view permission
- Role assignment permission

### Acceptance Criteria
- Role catalog and permissions are visible
- Admin role assignment updates are applied immediately for authorization checks

## 17) Platform Onboarding (`/platform/onboarding`) [Platform-Only]
### APIs
- `POST /api/v1/platform/onboarding/lenders`
- `GET /api/v1/platform/onboarding/lenders/:id`

### Permissions
- Platform super-admin scope only

### Acceptance Criteria
- Idempotent create call can onboard lender + first owner admin
- Onboarding status endpoint returns canonical status

## Definition of Done (Per Module)
## Auth + Session
- UI flows implemented for login, refresh, logout, setup-password
- Error envelope handling is consistent
- Token storage and renewal are safe

## Borrowers
- List/detail/risk/notes/override wired end-to-end
- Pagination and filter UX implemented
- Permission-aware UI states implemented

## Underwriting
- Queue + case screens ship with edit/checklist actions
- Blocked states clearly surfaced when approval preconditions are unmet

## Applications + Decisions
- Queue and detail decision workflow complete
- Offer preview integrated before approval
- Decision outcomes reflected in list/detail state

## Disbursements
- Create and transition actions integrated
- Idempotency key handling for mark-succeeded supported
- Failure reasons surfaced and logged in UI history

## Reports
- Summary, portfolio, collections, PAR screens implemented
- Date filter validation in UI
- Empty/loading/error states complete

## Audit + Jobs + Health
- Audit explorer with cursor pagination + filters complete
- CSV export trigger and download UX complete
- Jobs listing + retry action + health status complete

## Settings
- Lender settings read/update complete
- Admin users lifecycle and role assignment complete
- Permission-based route guards in frontend applied

## Cross-Cutting DoD
- All screens enforce tenant context from authenticated admin session
- All write actions display request failures using standard error fields (`code`, `message`, `requestId`)
- Loading, empty, and error states implemented for every screen
- API contracts match `docs/openapi.yaml`
- QA checklist passes for must-have screens
