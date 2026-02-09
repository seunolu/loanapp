# Project Bible — Nigerian Digital Lending Platform (Soft Loans)

## 1. Product Vision

Build a compliant, transparent, and sustainable Nigerian digital lending system that provides short-to-medium-term soft loans to individuals, with strong risk controls, operational tooling, and regulatory readiness.

## 2. Core Principles (Non-Negotiable)

1. Backend-first: business logic never lives in mobile apps.
2. Money correctness over speed: no shortcuts in calculations.
3. Auditability: every critical action must be traceable.
4. Pluggability: banks, KYC providers, and gateways can be swapped.
5. Compliance-aware by design: not retrofitted later.
6. Single source of truth: this Bible + PRD.

## 3. In Scope (V1)

### Borrower

- Account creation & authentication
- Identity & KYC submission
- Loan application
- Loan offer review & acceptance
- Loan disbursement tracking
- Repayment (partial & full)
- Loan history & receipts
- Notifications (SMS/email)

### Lending Engine

- Loan lifecycle management
- Interest & fee calculation
- Repayment scheduling
- Overdue tracking
- Ledger-based balance tracking

### Admin / Operations

- Customer management
- KYC review & approval
- Loan review & approval
- Disbursement monitoring
- Repayment & delinquency tracking
- Manual adjustments (with audit trail)
- Reports & exports

## 4. Out of Scope (V1)

- Peer-to-peer lending
- Crypto or wallet balances
- Salary deductions integrations
- AI/ML credit scoring (rules only in v1)
- Multiple currencies
- Agent network

## 5. Compliance & Governance (Engineering Impact)

The system must support:

- Explicit consent capture
- Data minimization
- Secure handling of PII
- Complaint and dispute handling hooks
- Non-harassing communication patterns
- Full loan disclosure storage (APR, fees, penalties)

## 6. Definition of Done (Global)

A feature is not done unless:

- Backend logic implemented
- Validations present
- Error states handled
- Tests written
- Logs & audit events emitted
- Documentation updated (PRD + Bible)
- Admin visibility exists (if relevant)

## 7. Change Control Rule

Any new feature must:

- Be added to PRD
- Be mapped in the Feature Traceability Matrix
- Be approved before coding
