# Domain Model (V1)

## 1. Bounded Contexts

- Identity & Access
- KYC
- Lending (Applications/Offers/Loans)
- Ledger & Payments
- Disbursement
- Notifications
- Audit & Compliance
- Admin Ops

## 2. Key Entities

- Borrower, BorrowerProfile, BorrowerDevice, Session
- KycCase, KycDocument
- LoanApplication, LoanOffer (snapshot), Loan (contract snapshot)
- RepaymentScheduleItem (expected plan)
- BankAccount, Disbursement
- Payment, WebhookEvent
- LedgerAccount, JournalEntry, JournalLine
- ConsentRecord, AuditLog
- AdminUser (RBAC)

## 3. Loan Lifecycle

LoanApplication: SUBMITTED → (UNDER_REVIEW) → APPROVED/REJECTED/EXPIRED  
LoanOffer: OFFERED → ACCEPTED/DECLINED/EXPIRED  
Loan: PENDING_DISBURSEMENT → ACTIVE → OVERDUE → CLOSED (optional: DEFAULTED/WRITTEN_OFF)

V1 rule: one ACTIVE/OVERDUE/PENDING_DISBURSEMENT loan per borrower.

## 4. Repayment Allocation Policy (fixed)

fees → penalties → interest → principal
