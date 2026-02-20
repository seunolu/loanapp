-- CreateTable
CREATE TABLE "BorrowerProfile" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerProfile_borrowerId_key" ON "BorrowerProfile"("borrowerId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_borrowerId_type_version_key" ON "ConsentRecord"("borrowerId", "type", "version");

-- CreateIndex
CREATE INDEX "ConsentRecord_borrowerId_acceptedAt_idx" ON "ConsentRecord"("borrowerId", "acceptedAt");

-- AddForeignKey
ALTER TABLE "BorrowerProfile" ADD CONSTRAINT "BorrowerProfile_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
