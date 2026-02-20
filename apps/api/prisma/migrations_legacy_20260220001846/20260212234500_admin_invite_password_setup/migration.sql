-- AlterTable
ALTER TABLE "AdminUser"
ALTER COLUMN "passwordHash" DROP NOT NULL,
ADD COLUMN "passwordSetAt" TIMESTAMP(3);
