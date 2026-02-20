-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'MANDATE_DEBIT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentProvider" ADD VALUE 'MONNIFY';
ALTER TYPE "PaymentProvider" ADD VALUE 'MANUAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'REQUIRES_ACTION';
ALTER TYPE "PaymentStatus" ADD VALUE 'SUCCESS';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "AuditChainState" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "mandateId" TEXT,
ADD COLUMN     "reference" TEXT;

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "bvnHash" TEXT,
    "ninHash" TEXT,
    "verifiedName" TEXT,
    "verifiedDob" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL,
    "matchScore" DOUBLE PRECISION,
    "riskFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "status" "MandateStatus" NOT NULL DEFAULT 'PENDING',
    "authorizationCode" TEXT,
    "customerCode" TEXT,
    "signatureHash" TEXT,
    "maxAmount" DECIMAL(18,2),
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "nextDebitAt" TIMESTAMP(3),
    "frequency" TEXT,
    "providerMandateRef" TEXT,
    "lastDebitAt" TIMESTAMP(3),
    "lastDebitStatus" "PaymentIntentStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateDebit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "attemptedAt" TIMESTAMP(3),
    "succeededAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MandateDebit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityVerification_lenderId_userId_createdAt_idx" ON "IdentityVerification"("lenderId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityVerification_lenderId_verificationStatus_createdAt_idx" ON "IdentityVerification"("lenderId", "verificationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityVerification_lenderId_bvnHash_idx" ON "IdentityVerification"("lenderId", "bvnHash");

-- CreateIndex
CREATE INDEX "UserConsent_lenderId_userId_acceptedAt_idx" ON "UserConsent"("lenderId", "userId", "acceptedAt");

-- CreateIndex
CREATE INDEX "UserConsent_lenderId_type_acceptedAt_idx" ON "UserConsent"("lenderId", "type", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mandate_providerMandateRef_key" ON "Mandate"("providerMandateRef");

-- CreateIndex
CREATE INDEX "Mandate_tenantId_borrowerId_idx" ON "Mandate"("tenantId", "borrowerId");

-- CreateIndex
CREATE INDEX "Mandate_tenantId_status_idx" ON "Mandate"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Mandate_tenantId_loanId_idx" ON "Mandate"("tenantId", "loanId");

-- CreateIndex
CREATE UNIQUE INDEX "MandateDebit_paymentIntentId_key" ON "MandateDebit"("paymentIntentId");

-- CreateIndex
CREATE INDEX "MandateDebit_tenantId_mandateId_status_idx" ON "MandateDebit"("tenantId", "mandateId", "status");

-- CreateIndex
CREATE INDEX "MandateDebit_tenantId_scheduledAt_status_idx" ON "MandateDebit"("tenantId", "scheduledAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_reference_key" ON "PaymentIntent"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_providerEventId_key" ON "WebhookEvent"("provider", "providerEventId");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "TenantLoanApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateDebit" ADD CONSTRAINT "MandateDebit_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateDebit" ADD CONSTRAINT "MandateDebit_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

