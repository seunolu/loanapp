BEGIN;

CREATE TABLE "BorrowerNote" (
  "id" TEXT NOT NULL,
  "lenderId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BorrowerNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BorrowerOverride" (
  "id" TEXT NOT NULL,
  "lenderId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "maxLoanKobo" INTEGER,
  "maxTenorDays" INTEGER,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BorrowerOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BorrowerOverride_borrowerId_key" ON "BorrowerOverride"("borrowerId");
CREATE INDEX "BorrowerNote_lenderId_borrowerId_createdAt_idx" ON "BorrowerNote"("lenderId", "borrowerId", "createdAt");
CREATE INDEX "BorrowerNote_createdById_idx" ON "BorrowerNote"("createdById");
CREATE INDEX "BorrowerOverride_lenderId_borrowerId_idx" ON "BorrowerOverride"("lenderId", "borrowerId");

ALTER TABLE "BorrowerNote"
  ADD CONSTRAINT "BorrowerNote_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BorrowerNote"
  ADD CONSTRAINT "BorrowerNote_borrowerId_fkey"
  FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BorrowerNote"
  ADD CONSTRAINT "BorrowerNote_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BorrowerOverride"
  ADD CONSTRAINT "BorrowerOverride_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BorrowerOverride"
  ADD CONSTRAINT "BorrowerOverride_borrowerId_fkey"
  FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BorrowerOverride"
  ADD CONSTRAINT "BorrowerOverride_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

