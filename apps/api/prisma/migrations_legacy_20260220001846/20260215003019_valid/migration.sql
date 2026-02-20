-- AlterTable
ALTER TABLE "BorrowerOverride" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Lender" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UnderwritingCase" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UnderwritingChecklistItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
