# PRD (V1) — Nigerian Digital Lending Platform (Soft Loans)

## 1. Personas

### Borrower

Nigerian adult (18+), smartphone user, needs short-term financial support, values clarity and trust.

### Admin (Operations)

Reviews KYC, approves loans, manages repayments/issues, needs visibility and control.

## 2. User Journeys

### Borrower

Register → KYC submit → Apply → Offer → Accept → Disbursement → Repay → Receipt → Close

### Admin

Review KYC → Review applications → Approve/reject → Monitor disbursements → Track repayments → Delinquency → Reports

## 3. Functional Requirements

### 3.1 Authentication

- Phone-based auth
- OTP verification
- Session & device tracking

Acceptance:

- User cannot proceed without verified contact
- Sessions are revocable

### 3.2 KYC

- Personal details capture
- Document upload
- Status: NOT_SUBMITTED / PENDING / APPROVED / REJECTED

Acceptance:

- KYC approval required before loan approval
- Admin actions are audited

### 3.3 Loan Application

- Amount, tenor, purpose (optional)
- Submission timestamp
- V1 rule: one active loan per borrower

Acceptance:

- Applications stored immutably
- Active-loan constraint enforced

### 3.4 Offer & Acceptance

- Offer snapshot: principal, interest, fees, schedule, expiry
- Explicit acceptance required

Acceptance:

- Offer snapshot stored permanently
- Acceptance stores timestamp + IP/device

### 3.5 Disbursement

- Admin-triggered in v1
- Status tracking + retries
- Idempotent requests

Acceptance:

- Disbursement is idempotent
- Failures retryable
- Events logged

### 3.6 Repayment

- Partial and full repayments
- Ledger allocations policy fixed:
  fees → penalties → interest → principal
- Receipts generated

Acceptance:

- Ledger reconciles
- Overpayment handled
- Loan closes at zero outstanding

### 3.7 Admin Dashboard

- KYC queue, loan queue, disbursement, repayments, reports
- Manual adjustments (restricted)

Acceptance:

- RBAC enforced
- All actions audited

### 3.8 Notifications

- SMS/email for approvals, disbursement, reminders, receipts
- Delivery logged

## 4. Non-Functional Requirements

- Security: rate limiting, validation, secure uploads, audit logs
- Performance: core API < 500ms target; heavy work in jobs
- Reliability: retries/timeouts, graceful degradation

## 5. Success Metrics (V1)

- Zero balance mismatches
- Ops can manage without DB edits
- Repayment accuracy + receipts
- Dispute/complaint supportability
