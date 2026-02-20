-- Add borrower actor tracking fields for case creation and status history.
ALTER TABLE "Case"
ADD COLUMN IF NOT EXISTS "createdByBorrowerId" TEXT;

ALTER TABLE "CaseStatusHistory"
ADD COLUMN IF NOT EXISTS "changedByBorrowerId" TEXT;

