ALTER TABLE "AdminUser"
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "lastLoginIp" TEXT,
ADD COLUMN "lastUserAgent" TEXT;
