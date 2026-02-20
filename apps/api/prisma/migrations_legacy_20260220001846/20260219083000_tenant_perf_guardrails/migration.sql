CREATE INDEX IF NOT EXISTS "TenantLoanApplication_tenantId_status_createdAt_idx"
  ON "TenantLoanApplication" ("tenantId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_createdAt_idx"
  ON "TenantDisbursement" ("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "LoanApplicationStatusHistory_tenantId_loanApplicationId_changedAt_idx"
  ON "LoanApplicationStatusHistory" ("tenantId", "loanApplicationId", "changedAt");

CREATE INDEX IF NOT EXISTS "LoanRepayment_tenantId_createdAt_idx"
  ON "LoanRepayment" ("tenantId", "createdAt");
