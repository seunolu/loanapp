-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "KycCaseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('PLATFORM_SUPER_ADMIN', 'OWNER', 'SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LoanApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'DISBURSED', 'REPAID', 'DEFAULTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanOfferStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING_DISBURSEMENT', 'ACTIVE', 'OVERDUE', 'CLOSED');

-- CreateEnum
CREATE TYPE "RepaymentScheduleItemStatus" AS ENUM ('PENDING', 'PAID', 'LATE');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalLineType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('INITIATED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('LOAN_REPAYMENT');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'FLUTTERWAVE');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PayoutIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('WEBHOOK', 'VERIFY', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RepaymentAllocationType" AS ENUM ('FEES', 'PENALTIES', 'INTEREST', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationAudienceType" AS ENUM ('BORROWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationRecordStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "LenderStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LenderOnboardingStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('ACCRUE_INTEREST', 'RECALC_BALANCES', 'SEND_NOTIFICATION', 'COLLECTIONS_ESCALATION', 'RISK_REEVALUATION', 'LEDGER_RECONCILE', 'INTEGRITY_SCAN', 'PROCESS_WEBHOOK_EVENT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "SystemIntegrityStatus" AS ENUM ('OK', 'FAILED');

-- CreateEnum
CREATE TYPE "UnderwritingCaseStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UnderwritingChecklistStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "TenantLoanApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF', 'SETTLED', 'REPAID', 'DEFAULTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DelinquencyStatus" AS ENUM ('CURRENT', 'OVERDUE', 'CHARGED_OFF');

-- CreateEnum
CREATE TYPE "TenantAdminRole" AS ENUM ('CREDIT_OFFICER', 'RISK_MANAGER', 'OPS', 'COLLECTIONS', 'SYSTEM', 'SUPER_ADMIN', 'TENANT_ADMIN');

-- CreateEnum
CREATE TYPE "TenantDisbursementMethod" AS ENUM ('BANK_TRANSFER', 'WALLET', 'CASH', 'MANUAL');

-- CreateEnum
CREATE TYPE "TenantDisbursementStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TenantDisbursementActorType" AS ENUM ('ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TenantLedgerEntryType" AS ENUM ('DISBURSEMENT', 'REPAYMENT', 'ACCRUAL', 'WRITE_OFF', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TenantLedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "TenantLedgerNormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "TenantLedgerAccountCode" AS ENUM ('CASH_MAIN', 'CASH', 'LOANS_RECEIVABLE', 'LOAN_PRINCIPAL_RECEIVABLE', 'LOAN_CLEARING', 'INTEREST_RECEIVABLE', 'FEES_RECEIVABLE', 'CASH_ON_HAND', 'BANK_CLEARING', 'WALLET_CLEARING', 'INTEREST_INCOME', 'FEE_INCOME', 'PENALTY_INCOME', 'WRITE_OFF_EXPENSE', 'SUSPENSE', 'CAPITAL_POOL_AVAILABLE', 'CAPITAL_POOL_DEPLOYED', 'CAPITAL_POOL_REPAID', 'CAPITAL_POOL_LOSSES');

-- CreateEnum
CREATE TYPE "CapitalPoolType" AS ENUM ('TREASURY', 'INVESTOR', 'CREDIT_LINE');

-- CreateEnum
CREATE TYPE "CapitalPoolStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CapitalAllocationStatus" AS ENUM ('RESERVED', 'DEPLOYED', 'RELEASED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "TenantRepaymentScheduleStatus" AS ENUM ('DUE', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TenantRepaymentMethod" AS ENUM ('BANK_TRANSFER', 'CARD', 'WALLET', 'CASH');

-- CreateEnum
CREATE TYPE "InterestType" AS ENUM ('FLAT', 'REDUCING');

-- CreateEnum
CREATE TYPE "RepaymentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('FIXED', 'PERCENT_OF_PRINCIPAL');

-- CreateEnum
CREATE TYPE "FeeApplyAt" AS ENUM ('UPFRONT', 'PER_INSTALLMENT', 'END');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CollectionsCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PROMISE_TO_PAY', 'BROKEN_PTP', 'RESOLVED', 'CLOSED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "CollectionsStage" AS ENUM ('SOFT', 'FIELD', 'LEGAL');

-- CreateEnum
CREATE TYPE "CollectionsActionType" AS ENUM ('CALL', 'SMS', 'WHATSAPP', 'EMAIL', 'VISIT', 'NOTE', 'PTP_SET', 'PTP_BROKEN', 'DISPUTE', 'WAIVER', 'WRITE_OFF', 'OTHER');

-- CreateEnum
CREATE TYPE "PenaltyRuleKind" AS ENUM ('DAILY_PERCENT', 'FLAT');

-- CreateEnum
CREATE TYPE "ReconciliationRunType" AS ENUM ('PAYMENT', 'DISBURSEMENT', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReconciliationIssueCategory" AS ENUM ('MISSING_LEDGER', 'DUPLICATE_LEDGER', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'UNKNOWN_REFERENCE', 'FEE_MISMATCH');

-- CreateEnum
CREATE TYPE "ReconciliationIssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReconciliationEntityType" AS ENUM ('PAYMENT', 'DISBURSEMENT');

-- CreateEnum
CREATE TYPE "ReconciliationIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'MISMATCH', 'SUSPENSE', 'RESOLVED', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "ReconciliationResolutionType" AS ENUM ('MANUAL_ADJUSTMENT', 'WRITE_OFF', 'PROVIDER_ERROR', 'INTERNAL_ERROR', 'DUPLICATE', 'REFUND');

-- CreateEnum
CREATE TYPE "SettlementBatchStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReconciliationJobRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskDecision" AS ENUM ('APPROVE', 'REVIEW', 'DECLINE');

-- CreateEnum
CREATE TYPE "RiskEngineTrigger" AS ENUM ('AUTO_ON_SUBMISSION', 'MANUAL_ADMIN', 'SYSTEM_REEVAL');

-- CreateEnum
CREATE TYPE "RiskHoldType" AS ENUM ('FRAUD_SUSPECTED', 'KYC_MISSING', 'DOCUMENTS_MISSING', 'POLICY_VIOLATION', 'MANUAL_REVIEW', 'COLLECTIONS_REVIEW', 'SYSTEM_VELOCITY');

-- CreateEnum
CREATE TYPE "LoanRepaymentScheduleItemStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "LoanRepaymentChannel" AS ENUM ('MANUAL', 'BANK_TRANSFER', 'CARD', 'USSD', 'CASH');

-- CreateEnum
CREATE TYPE "InterestAccrualAction" AS ENUM ('PAUSED', 'RESUMED', 'RATE_OVERRIDE_SET', 'RATE_OVERRIDE_REMOVED');

-- CreateEnum
CREATE TYPE "BlacklistEntryType" AS ENUM ('PHONE', 'BVN_LAST4', 'DEVICE_ID', 'IP');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FraudSignalType" AS ENUM ('MULTIPLE_APPLICATIONS_SHORT_WINDOW', 'DEVICE_MISMATCH', 'HIGH_RISK_SCORE', 'REPAYMENT_PATTERN_ANOMALY', 'GEO_MISMATCH', 'MANUAL_FLAG', 'LOGIN_FAILED', 'OTP_FAILED', 'DEVICE_CHANGED', 'MULTIPLE_ACCOUNTS_SUSPECTED', 'BANK_ACCOUNT_CHANGED', 'REPAYMENT_REVERSAL', 'CARD_CHARGEBACK', 'PAYMENT_VELOCITY_SPIKE', 'COLLECTIONS_ESCALATION', 'MANUAL_REVIEW_REQUESTED', 'ADMIN_OVERRIDE', 'IP_GEO_ANOMALY');

-- CreateEnum
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FraudAlertStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE', 'ESCALATED');

-- CreateEnum
CREATE TYPE "FraudLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('COMPLAINT', 'DISPUTE', 'REQUEST');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'AWAITING_BORROWER', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CaseResolutionCode" AS ENUM ('REFUND_ISSUED', 'WAIVER_GRANTED', 'PAYMENT_REVERSED', 'CORRECTION_MADE', 'NO_ACTION_REQUIRED', 'FRAUD_CONFIRMED', 'FRAUD_NOT_CONFIRMED', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseMessageVisibility" AS ENUM ('INTERNAL', 'BORROWER');

-- CreateEnum
CREATE TYPE "HardshipStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HardshipType" AS ENUM ('PAYMENT_PAUSE', 'TENOR_EXTENSION', 'RATE_REDUCTION');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAIL');

-- CreateTable
CREATE TABLE "AppMeta" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tenantId" TEXT,
    "scope" TEXT,
    "requestMethod" TEXT NOT NULL,
    "requestPath" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PENDING',
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "action" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'SUCCESS',
    "summary" TEXT,
    "tenantId" TEXT,
    "lenderId" TEXT,
    "requestId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "actorType" TEXT,
    "actorId" TEXT,
    "actorRole" TEXT,
    "entity" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "error" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "tenantId" TEXT,
    "lenderId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "metadataJson" JSONB,
    "idempotencyKey" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspiciousActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,

    CONSTRAINT "SuspiciousActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "audienceType" "NotificationAudienceType" NOT NULL,
    "audienceUserId" TEXT NOT NULL,
    "channel" "NotificationDeliveryChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dataJson" JSONB NOT NULL,
    "status" "NotificationRecordStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lender" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "LenderStatus" NOT NULL DEFAULT 'ACTIVE',
    "onboardingStatus" "LenderOnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "onboardedAt" TIMESTAMP(3),
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lenderTitle" TEXT,
    "apiBaseUrl" TEXT,
    "theme" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantAdminUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "TenantAdminRole" NOT NULL DEFAULT 'CREDIT_OFFICER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "tenantId" TEXT NOT NULL,
    "lenderId" TEXT,
    "dedupeKey" TEXT,
    "payload" JSONB NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "lastError" TEXT,
    "backoffMs" INTEGER NOT NULL DEFAULT 5000,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "succeededAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemIntegritySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalLoansChecked" INTEGER NOT NULL,
    "failuresCount" INTEGER NOT NULL,
    "status" "SystemIntegrityStatus" NOT NULL,
    "details" JSONB,

    CONSTRAINT "SystemIntegritySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAggregate" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "activeLoansCount" INTEGER NOT NULL,
    "overdueLoansCount" INTEGER NOT NULL,
    "principalOutstandingKobo" INTEGER NOT NULL,
    "totalOutstandingKobo" INTEGER NOT NULL,
    "disbursedKobo" INTEGER NOT NULL,
    "collectionsKobo" INTEGER NOT NULL,
    "par1Kobo" INTEGER NOT NULL,
    "par7Kobo" INTEGER NOT NULL,
    "par30Kobo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "otpRef" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Borrower" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Borrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "deviceId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "fingerprint" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerRiskProfile" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerRiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlacklistEntry" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT,
    "type" "BlacklistEntryType" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlacklistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEvent" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "deviceId" TEXT,
    "eventType" TEXT NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerNote" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BorrowerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerOverride" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "maxLoanKobo" INTEGER,
    "maxTenorDays" INTEGER,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerDevice" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT,
    "deviceName" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "borrowerDeviceId" TEXT,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycCase" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "status" "KycCaseStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "kycCaseId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "passwordSetAt" TIMESTAMP(3),
    "role" "AdminRole" NOT NULL,
    "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "lastUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRoleAssignment" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInviteToken" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplication" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "amountRequested" INTEGER NOT NULL,
    "tenorDays" INTEGER NOT NULL,
    "status" "LoanApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLoanApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "TenantLoanApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "principal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "annualInterestRateBps" INTEGER NOT NULL DEFAULT 0,
    "termInDays" INTEGER NOT NULL DEFAULT 0,
    "repaymentFrequency" "RepaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "disbursedAt" TIMESTAMP(3),
    "requestedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "approvedAmount" DECIMAL(18,2),
    "disbursedAmount" DECIMAL(18,2),
    "annualInterestRate" DECIMAL(8,4),
    "lastAccruedAt" TIMESTAMP(3),
    "interestAccrualPaused" BOOLEAN NOT NULL DEFAULT false,
    "interestPausedUntil" TIMESTAMP(3),
    "interestPausedAt" TIMESTAMP(3),
    "interestPausedById" TEXT,
    "interestPauseReason" TEXT,
    "interestOverrideRate" DECIMAL(10,5),
    "interestOverrideSetAt" TIMESTAMP(3),
    "interestOverrideSetById" TEXT,
    "outstandingPrincipal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstandingInterest" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstandingFees" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstandingTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "delinquencyBucket" TEXT,
    "overdueAmountCents" BIGINT NOT NULL DEFAULT 0,
    "delinquencyStatus" "DelinquencyStatus" NOT NULL DEFAULT 'CURRENT',
    "totalPenaltyAccrued" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalPenaltyPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lastPenaltyAccrualDate" TIMESTAMP(3),
    "writtenOffAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "lastDelinquencyCalcAt" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "fullyRepaidAt" TIMESTAMP(3),
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dob" TIMESTAMP(3),
    "address" TEXT,
    "amount" INTEGER NOT NULL,
    "tenorMonths" INTEGER NOT NULL,
    "purpose" TEXT,
    "employmentStatus" TEXT,
    "incomeBand" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRiskScore" INTEGER,
    "lastRiskDecision" "RiskDecision",
    "lastRiskEvaluatedAt" TIMESTAMP(3),
    "lastRiskEvaluationId" TEXT,

    CONSTRAINT "TenantLoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardshipRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "type" "HardshipType" NOT NULL,
    "reason" TEXT NOT NULL,
    "proposedTenorMonths" INTEGER,
    "proposedRate" DECIMAL(10,5),
    "pauseDays" INTEGER,
    "status" "HardshipStatus" NOT NULL DEFAULT 'REQUESTED',
    "decisionNotes" TEXT,
    "approvedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "HardshipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardshipStatusHistory" (
    "id" TEXT NOT NULL,
    "hardshipRequestId" TEXT NOT NULL,
    "fromStatus" "HardshipStatus" NOT NULL,
    "toStatus" "HardshipStatus" NOT NULL,
    "changedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HardshipStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanDecisionPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "approveThreshold" INTEGER NOT NULL,
    "manualReviewMin" INTEGER NOT NULL,
    "maxExposure" DECIMAL(18,2) NOT NULL,
    "hardBlockFlags" TEXT[],
    "allowUnderReviewReeval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanDecisionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanDecisionEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "decision" TEXT NOT NULL,
    "reasonCodes" TEXT[],
    "inputsJson" JSONB NOT NULL,
    "recommendedLimit" DECIMAL(18,2),
    "recommendedTenorDays" INTEGER,

    CONSTRAINT "LoanDecisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudSignalEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "metadataJson" JSONB NOT NULL,

    CONSTRAINT "FraudSignalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "loanApplicationId" TEXT,
    "type" "FraudSignalType" NOT NULL,
    "severity" "FraudSeverity" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "scoreImpact" INTEGER NOT NULL,
    "metadataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudSignalAggregate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "fraudLevel" "FraudLevel" NOT NULL DEFAULT 'NONE',
    "flags" TEXT[],
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudSignalAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerHold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdByAdminId" TEXT,
    "createdBySystem" BOOLEAN NOT NULL DEFAULT false,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "loanApplicationId" TEXT,
    "status" "FraudAlertStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "FraudSeverity" NOT NULL,
    "autoGenerated" BOOLEAN NOT NULL DEFAULT true,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudAlertSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fraudAlertId" TEXT NOT NULL,
    "fraudSignalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudAlertSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerBehaviorSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "totalApplications" INTEGER NOT NULL DEFAULT 0,
    "totalApproved" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "totalDisbursedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalRepaidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "defaultCount" INTEGER NOT NULL DEFAULT 0,
    "lastApplicationAt" TIMESTAMP(3),
    "lastRepaymentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerBehaviorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerBlacklist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "identifierValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BorrowerBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "configJson" JSONB NOT NULL,

    CONSTRAINT "RiskPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEvaluation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "trigger" "RiskEngineTrigger" NOT NULL,
    "score" INTEGER NOT NULL,
    "decision" "RiskDecision" NOT NULL,
    "reasonsJson" JSONB NOT NULL,
    "inputSnapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "RiskEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestAccrualAudit" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" "InterestAccrualAction" NOT NULL,
    "previousRate" DECIMAL(10,5),
    "newRate" DECIMAL(10,5),
    "reason" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestAccrualAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplicationRiskAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "decision" "RiskDecision" NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" TEXT,

    CONSTRAINT "LoanApplicationRiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplicationRiskAssessmentHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "decision" "RiskDecision" NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" TEXT,

    CONSTRAINT "LoanApplicationRiskAssessmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplicationHold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "type" "RiskHoldType" NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    "resolutionNote" TEXT,

    CONSTRAINT "LoanApplicationHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepaymentScheduleItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "principalDue" DECIMAL(18,2) NOT NULL,
    "interestDue" DECIMAL(18,2) NOT NULL,
    "feesDue" DECIMAL(18,2) NOT NULL,
    "totalDue" DECIMAL(18,2) NOT NULL,
    "principalPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "interestPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "feesPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "LoanRepaymentScheduleItemStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "overdueSince" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanRepaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "postedAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "channel" "LoanRepaymentChannel" NOT NULL DEFAULT 'MANUAL',
    "allocationJson" JSONB NOT NULL,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelinquencyEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "dpd" INTEGER NOT NULL,
    "bucket" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelinquencyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "note" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "loanApplicationId" TEXT,
    "repaymentId" TEXT,
    "disbursementId" TEXT,
    "type" "CaseType" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CasePriority" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedToAdminUserId" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "lastOverdueNotifiedAt" TIMESTAMP(3),
    "resolutionCode" "CaseResolutionCode",
    "resolutionNotes" TEXT,
    "createdByAdminUserId" TEXT,
    "createdByBorrowerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "visibility" "CaseMessageVisibility" NOT NULL,
    "message" TEXT NOT NULL,
    "createdByAdminUserId" TEXT,
    "createdByBorrowerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "changedByAdminUserId" TEXT,
    "changedByBorrowerId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionsCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanAccountId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CollectionsCaseStatus" NOT NULL DEFAULT 'OPEN',
    "stage" "CollectionsStage" NOT NULL DEFAULT 'SOFT',
    "dpdAtOpen" INTEGER NOT NULL DEFAULT 0,
    "currentDpd" INTEGER NOT NULL DEFAULT 0,
    "outstandingAtOpen" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currentOutstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "assignedToAdminUserId" TEXT,
    "promiseToPayAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionsCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionsAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorAdminUserId" TEXT,
    "type" "CollectionsActionType" NOT NULL,
    "note" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionsAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "PenaltyRuleKind" NOT NULL,
    "rateBpsPerDay" INTEGER,
    "flatAmount" DECIMAL(18,2),
    "graceDays" INTEGER NOT NULL DEFAULT 0,
    "capAmount" DECIMAL(18,2),
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenaltyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPenaltyAccrual" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanAccountId" TEXT NOT NULL,
    "accruedForDate" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPenaltyAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDisbursement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "method" "TenantDisbursementMethod" NOT NULL,
    "status" "TenantDisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerReference" TEXT,
    "initiatedByAdminId" TEXT,
    "initiatedBySystem" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "reference" TEXT,
    "disbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalPool" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CapitalPoolType" NOT NULL,
    "status" "CapitalPoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "externalRef" TEXT,
    "rulesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalPoolBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "available" DECIMAL(18,2) NOT NULL,
    "deployed" DECIMAL(18,2) NOT NULL,
    "repaid" DECIMAL(18,2) NOT NULL,
    "losses" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapitalPoolBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioDailySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "activeLoanCount" INTEGER NOT NULL DEFAULT 0,
    "outstandingTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "par30Outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "par90Outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disbursedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "repaidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioDailySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "status" "CapitalAllocationStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deployedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "releasedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "writtenOffAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDisbursementStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "disbursementId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "fromStatus" "TenantDisbursementStatus",
    "toStatus" "TenantDisbursementStatus" NOT NULL,
    "note" TEXT,
    "actorType" "TenantDisbursementActorType" NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantDisbursementStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLedgerAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" "TenantLedgerAccountCode" NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LedgerAccountType" NOT NULL DEFAULT 'ASSET',
    "normalBalance" "TenantLedgerNormalBalance" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantLedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLedgerEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" "TenantLedgerEntryType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdBy" TEXT,
    "reversalOfEntryId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLedgerLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "direction" "TenantLedgerDirection" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "amountMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantLedgerLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRepaymentSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalDue" DECIMAL(18,2) NOT NULL,
    "interestDue" DECIMAL(18,2) NOT NULL,
    "feesDue" DECIMAL(18,2) NOT NULL,
    "totalDue" DECIMAL(18,2) NOT NULL,
    "status" "TenantRepaymentScheduleStatus" NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantRepaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRepayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "method" "TenantRepaymentMethod" NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "fromStatus" "TenantLoanApplicationStatus",
    "toStatus" "TenantLoanApplicationStatus" NOT NULL,
    "note" TEXT,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantLoanApplicationEvent" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "fromStatus" "TenantLoanApplicationStatus" NOT NULL,
    "toStatus" "TenantLoanApplicationStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantLoanApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "minPrincipal" INTEGER NOT NULL,
    "maxPrincipal" INTEGER NOT NULL,
    "minTenorDays" INTEGER NOT NULL,
    "maxTenorDays" INTEGER NOT NULL,
    "interestType" "InterestType" NOT NULL,
    "interestRateBps" INTEGER NOT NULL,
    "repaymentFrequency" "RepaymentFrequency" NOT NULL,
    "graceDays" INTEGER NOT NULL DEFAULT 0,
    "allowEarlyRepayment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanProductFee" (
    "id" TEXT NOT NULL,
    "loanProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FeeType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "applyAt" "FeeApplyAt" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanProductFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanProductVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanProductId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanProductVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnderwritingCase" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "status" "UnderwritingCaseStatus" NOT NULL DEFAULT 'PENDING',
    "monthlyIncomeKobo" INTEGER,
    "existingDebtKobo" INTEGER,
    "riskLevel" TEXT,
    "decisionNotes" TEXT,
    "decidedByAdminId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnderwritingCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnderwritingChecklistItem" (
    "id" TEXT NOT NULL,
    "underwritingCaseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "UnderwritingChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnderwritingChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanOffer" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "status" "LoanOfferStatus" NOT NULL DEFAULT 'OFFERED',
    "principalAmount" INTEGER NOT NULL,
    "interestAmount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "totalRepayable" INTEGER NOT NULL,
    "offeredByAdminId" TEXT NOT NULL,
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanOfferScheduleItem" (
    "id" TEXT NOT NULL,
    "loanOfferId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanOfferScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanOfferId" TEXT NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING_DISBURSEMENT',
    "principalAmount" INTEGER NOT NULL,
    "interestAmount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "totalRepayable" INTEGER NOT NULL,
    "contractSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentScheduleItem" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "RepaymentScheduleItemStatus" NOT NULL DEFAULT 'PENDING',
    "paidAmountKobo" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatedBy" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "journalEntryId" TEXT,
    "succeededAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL DEFAULT 'LOAN_REPAYMENT',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "providerRef" TEXT,
    "authorizationUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED',
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER,
    "netMinor" INTEGER,
    "borrowerId" TEXT,
    "loanId" TEXT,
    "repaymentScheduleId" TEXT,
    "disbursementId" TEXT,
    "providerReference" TEXT,
    "providerIntentId" TEXT,
    "providerCustomerId" TEXT,
    "providerRawInit" JSONB,
    "providerRawVerify" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "createdByAdminId" TEXT,
    "createdByBorrowerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerPayoutProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "recipientCode" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerPayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutIntent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PayoutIntentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL,
    "paymentIntentId" TEXT,
    "providerTransferCode" TEXT,
    "providerReference" TEXT,
    "recipientCode" TEXT NOT NULL,
    "metadata" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "lastError" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recipientProfileId" TEXT,

    CONSTRAINT "PayoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "payoutId" TEXT,
    "type" "PaymentEventType" NOT NULL,
    "normalizedType" TEXT,
    "providerEventId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "raw" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntentHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "fromStatus" "PaymentIntentStatus",
    "toStatus" "PaymentIntentStatus" NOT NULL,
    "reason" TEXT,
    "actorType" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIntentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ReconciliationRunType" NOT NULL,
    "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "triggeredByAdminId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT,
    "provider" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "providerRef" TEXT,
    "settlementBatchId" TEXT,
    "amountMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'MATCHED',
    "mismatchReason" TEXT,
    "suspenseLedgerEntryId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    "resolutionType" "ReconciliationResolutionType",
    "resolutionNote" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationResolutionHistory" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "fromStatus" "ReconciliationStatus" NOT NULL,
    "toStatus" "ReconciliationStatus" NOT NULL,
    "resolutionType" "ReconciliationResolutionType",
    "note" TEXT,
    "actedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationResolutionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "SettlementBatchStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationJobRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "status" "ReconciliationJobRunStatus" NOT NULL DEFAULT 'RUNNING',
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "mismatchCount" INTEGER NOT NULL DEFAULT 0,
    "suspenseCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationIssue" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "ReconciliationIssueCategory" NOT NULL,
    "severity" "ReconciliationIssueSeverity" NOT NULL,
    "entityType" "ReconciliationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "providerRef" TEXT,
    "expected" JSONB,
    "actual" JSONB,
    "expectedHash" TEXT NOT NULL,
    "status" "ReconciliationIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "acknowledgedByAdminId" TEXT,
    "resolvedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanBalance" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "outstandingPrincipalKobo" INTEGER NOT NULL,
    "outstandingInterestKobo" INTEGER NOT NULL,
    "outstandingFeesKobo" INTEGER NOT NULL,
    "outstandingPenaltiesKobo" INTEGER NOT NULL DEFAULT 0,
    "totalOutstandingKobo" INTEGER NOT NULL,
    "paidPrincipalKobo" INTEGER NOT NULL DEFAULT 0,
    "paidInterestKobo" INTEGER NOT NULL DEFAULT 0,
    "paidFeesKobo" INTEGER NOT NULL DEFAULT 0,
    "paidPenaltiesKobo" INTEGER NOT NULL DEFAULT 0,
    "totalPaidKobo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "allocatedFeesKobo" INTEGER NOT NULL DEFAULT 0,
    "allocatedPenaltiesKobo" INTEGER NOT NULL DEFAULT 0,
    "allocatedInterestKobo" INTEGER NOT NULL DEFAULT 0,
    "allocatedPrincipalKobo" INTEGER NOT NULL DEFAULT 0,
    "unallocatedKobo" INTEGER NOT NULL DEFAULT 0,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentAllocation" (
    "id" TEXT NOT NULL,
    "repaymentId" TEXT NOT NULL,
    "bucket" "RepaymentAllocationType" NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyAccrual" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "accrualDate" TIMESTAMP(3) NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenaltyAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "eventType" TEXT,
    "providerEventId" TEXT,
    "reference" TEXT,
    "signature" TEXT,
    "signatureValid" BOOLEAN NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "paymentId" TEXT,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "referenceType" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
    "referenceId" TEXT,
    "description" TEXT,
    "createdBy" TEXT,
    "reference" TEXT,
    "requestId" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT,
    "ledgerAccountId" TEXT NOT NULL,
    "debitMinor" INTEGER NOT NULL DEFAULT 0,
    "creditMinor" INTEGER NOT NULL DEFAULT 0,
    "entryType" "JournalLineType" NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppMeta_key_key" ON "AppMeta"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_tenantId_scope_createdAt_idx" ON "IdempotencyKey"("tenantId", "scope", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_requestMethod_requestPath_key" ON "IdempotencyKey"("key", "requestMethod", "requestPath");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_tenantId_scope_key_key" ON "IdempotencyKey"("tenantId", "scope", "key");

-- CreateIndex
CREATE INDEX "AuditLog_event_idx" ON "AuditLog"("event");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_lenderId_createdAt_idx" ON "AuditLog"("lenderId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_createdAt_idx" ON "AuditLog"("actorType", "actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_idempotencyKey_key" ON "AuditEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_createdAt_idx" ON "AuditEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_tenantId_createdAt_idx" ON "SuspiciousActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_tenantId_resolved_createdAt_idx" ON "SuspiciousActivity"("tenantId", "resolved", "createdAt");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_tenantId_entityType_entityId_idx" ON "SuspiciousActivity"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "FeatureFlag_tenantId_key_enabled_idx" ON "FeatureFlag"("tenantId", "key", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_tenantId_key_key" ON "FeatureFlag"("tenantId", "key");

-- CreateIndex
CREATE INDEX "NotificationLog_event_createdAt_idx" ON "NotificationLog"("event", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_recipient_createdAt_idx" ON "NotificationLog"("recipient", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_audienceType_audienceUserId_createdAt_idx" ON "Notification"("tenantId", "audienceType", "audienceUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_tenantId_idempotencyKey_key" ON "Notification"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_notificationId_key" ON "NotificationOutbox"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_tenantId_status_nextAttemptAt_idx" ON "NotificationOutbox"("tenantId", "status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lender_slug_key" ON "Lender"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "TenantAdminUser_tenantId_idx" ON "TenantAdminUser"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAdminUser_tenantId_email_key" ON "TenantAdminUser"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE INDEX "Job_tenantId_status_runAt_idx" ON "Job"("tenantId", "status", "runAt");

-- CreateIndex
CREATE INDEX "SystemIntegritySnapshot_tenantId_checkedAt_idx" ON "SystemIntegritySnapshot"("tenantId", "checkedAt");

-- CreateIndex
CREATE INDEX "SystemIntegritySnapshot_checkedAt_idx" ON "SystemIntegritySnapshot"("checkedAt");

-- CreateIndex
CREATE INDEX "DailyAggregate_date_idx" ON "DailyAggregate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAggregate_lenderId_date_key" ON "DailyAggregate"("lenderId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OtpChallenge_otpRef_key" ON "OtpChallenge"("otpRef");

-- CreateIndex
CREATE INDEX "OtpChallenge_lenderId_idx" ON "OtpChallenge"("lenderId");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "Borrower_lenderId_idx" ON "Borrower"("lenderId");

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_lenderId_phone_key" ON "Borrower"("lenderId", "phone");

-- CreateIndex
CREATE INDEX "Device_borrowerId_lastSeenAt_idx" ON "Device"("borrowerId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Device_lenderId_deviceId_key" ON "Device"("lenderId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerRiskProfile_borrowerId_key" ON "BorrowerRiskProfile"("borrowerId");

-- CreateIndex
CREATE INDEX "BorrowerRiskProfile_lenderId_level_idx" ON "BorrowerRiskProfile"("lenderId", "level");

-- CreateIndex
CREATE INDEX "BlacklistEntry_type_value_isActive_idx" ON "BlacklistEntry"("type", "value", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistEntry_lenderId_type_value_key" ON "BlacklistEntry"("lenderId", "type", "value");

-- CreateIndex
CREATE INDEX "RiskEvent_lenderId_createdAt_idx" ON "RiskEvent"("lenderId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskEvent_borrowerId_createdAt_idx" ON "RiskEvent"("borrowerId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskEvent_eventType_createdAt_idx" ON "RiskEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "BorrowerNote_lenderId_borrowerId_createdAt_idx" ON "BorrowerNote"("lenderId", "borrowerId", "createdAt");

-- CreateIndex
CREATE INDEX "BorrowerNote_createdById_idx" ON "BorrowerNote"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerOverride_borrowerId_key" ON "BorrowerOverride"("borrowerId");

-- CreateIndex
CREATE INDEX "BorrowerOverride_lenderId_borrowerId_idx" ON "BorrowerOverride"("lenderId", "borrowerId");

-- CreateIndex
CREATE INDEX "BorrowerDevice_borrowerId_idx" ON "BorrowerDevice"("borrowerId");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerDevice_borrowerId_deviceId_key" ON "BorrowerDevice"("borrowerId", "deviceId");

-- CreateIndex
CREATE INDEX "Session_borrowerId_idx" ON "Session"("borrowerId");

-- CreateIndex
CREATE INDEX "Session_borrowerDeviceId_idx" ON "Session"("borrowerDeviceId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_revokedAt_idx" ON "Session"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerProfile_borrowerId_key" ON "BorrowerProfile"("borrowerId");

-- CreateIndex
CREATE INDEX "ConsentRecord_borrowerId_acceptedAt_idx" ON "ConsentRecord"("borrowerId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_borrowerId_type_version_key" ON "ConsentRecord"("borrowerId", "type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "File_storageKey_key" ON "File"("storageKey");

-- CreateIndex
CREATE INDEX "File_borrowerId_status_idx" ON "File"("borrowerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "KycCase_borrowerId_key" ON "KycCase"("borrowerId");

-- CreateIndex
CREATE INDEX "KycCase_lenderId_idx" ON "KycCase"("lenderId");

-- CreateIndex
CREATE INDEX "KycDocument_fileId_idx" ON "KycDocument"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "KycDocument_kycCaseId_fileId_key" ON "KycDocument"("kycCaseId", "fileId");

-- CreateIndex
CREATE INDEX "AdminUser_lenderId_idx" ON "AdminUser"("lenderId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_lenderId_email_key" ON "AdminUser"("lenderId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Role_lenderId_createdAt_idx" ON "Role"("lenderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_lenderId_name_key" ON "Role"("lenderId", "name");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRoleAssignment_adminUserId_key" ON "AdminRoleAssignment"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminRoleAssignment_lenderId_roleId_idx" ON "AdminRoleAssignment"("lenderId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRoleAssignment_lenderId_adminUserId_key" ON "AdminRoleAssignment"("lenderId", "adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInviteToken_tokenHash_key" ON "AdminInviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminInviteToken_adminUserId_expiresAt_idx" ON "AdminInviteToken"("adminUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminSession_revokedAt_idx" ON "AdminSession"("revokedAt");

-- CreateIndex
CREATE INDEX "LoanApplication_lenderId_status_idx" ON "LoanApplication"("lenderId", "status");

-- CreateIndex
CREATE INDEX "LoanApplication_borrowerId_status_idx" ON "LoanApplication"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "LoanApplication_createdAt_idx" ON "LoanApplication"("createdAt");

-- CreateIndex
CREATE INDEX "TenantLoanApplication_tenantId_idx" ON "TenantLoanApplication"("tenantId");

-- CreateIndex
CREATE INDEX "TenantLoanApplication_tenantId_createdAt_idx" ON "TenantLoanApplication"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantLoanApplication_tenantId_status_createdAt_idx" ON "TenantLoanApplication"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TenantLoanApplication_tenantId_deviceId_idx" ON "TenantLoanApplication"("tenantId", "deviceId");

-- CreateIndex
CREATE INDEX "HardshipRequest_tenantId_borrowerId_createdAt_idx" ON "HardshipRequest"("tenantId", "borrowerId", "createdAt");

-- CreateIndex
CREATE INDEX "HardshipRequest_tenantId_status_createdAt_idx" ON "HardshipRequest"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "HardshipRequest_tenantId_loanApplicationId_status_idx" ON "HardshipRequest"("tenantId", "loanApplicationId", "status");

-- CreateIndex
CREATE INDEX "HardshipStatusHistory_hardshipRequestId_createdAt_idx" ON "HardshipStatusHistory"("hardshipRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "LoanDecisionPolicy_tenantId_isActive_idx" ON "LoanDecisionPolicy"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "LoanDecisionPolicy_tenantId_productId_isActive_idx" ON "LoanDecisionPolicy"("tenantId", "productId", "isActive");

-- CreateIndex
CREATE INDEX "LoanDecisionEvent_tenantId_loanApplicationId_idx" ON "LoanDecisionEvent"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanDecisionEvent_loanApplicationId_createdAt_key" ON "LoanDecisionEvent"("loanApplicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FraudSignalEvent_loanApplicationId_key" ON "FraudSignalEvent"("loanApplicationId");

-- CreateIndex
CREATE INDEX "FraudSignalEvent_tenantId_loanApplicationId_idx" ON "FraudSignalEvent"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "FraudSignalEvent_tenantId_createdAt_idx" ON "FraudSignalEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudSignal_tenantId_idx" ON "FraudSignal"("tenantId");

-- CreateIndex
CREATE INDEX "FraudSignal_tenantId_loanApplicationId_idx" ON "FraudSignal"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "FraudSignal_tenantId_borrowerId_idx" ON "FraudSignal"("tenantId", "borrowerId");

-- CreateIndex
CREATE INDEX "FraudSignal_tenantId_borrowerId_createdAt_idx" ON "FraudSignal"("tenantId", "borrowerId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudSignal_tenantId_loanApplicationId_createdAt_idx" ON "FraudSignal"("tenantId", "loanApplicationId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudSignal_tenantId_createdAt_idx" ON "FraudSignal"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudSignalAggregate_tenantId_fraudLevel_updatedAt_idx" ON "FraudSignalAggregate"("tenantId", "fraudLevel", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FraudSignalAggregate_tenantId_borrowerId_key" ON "FraudSignalAggregate"("tenantId", "borrowerId");

-- CreateIndex
CREATE INDEX "BorrowerHold_tenantId_borrowerId_status_idx" ON "BorrowerHold"("tenantId", "borrowerId", "status");

-- CreateIndex
CREATE INDEX "BorrowerHold_tenantId_createdAt_idx" ON "BorrowerHold"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudAlert_tenantId_status_severity_idx" ON "FraudAlert"("tenantId", "status", "severity");

-- CreateIndex
CREATE INDEX "FraudAlert_tenantId_loanApplicationId_idx" ON "FraudAlert"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "FraudAlert_tenantId_borrowerId_idx" ON "FraudAlert"("tenantId", "borrowerId");

-- CreateIndex
CREATE INDEX "FraudAlert_tenantId_createdAt_idx" ON "FraudAlert"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudAlertSignal_tenantId_fraudAlertId_idx" ON "FraudAlertSignal"("tenantId", "fraudAlertId");

-- CreateIndex
CREATE UNIQUE INDEX "FraudAlertSignal_fraudAlertId_fraudSignalId_key" ON "FraudAlertSignal"("fraudAlertId", "fraudSignalId");

-- CreateIndex
CREATE INDEX "BorrowerBehaviorSnapshot_tenantId_updatedAt_idx" ON "BorrowerBehaviorSnapshot"("tenantId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerBehaviorSnapshot_tenantId_borrowerId_key" ON "BorrowerBehaviorSnapshot"("tenantId", "borrowerId");

-- CreateIndex
CREATE INDEX "BorrowerBlacklist_tenantId_identifierType_idx" ON "BorrowerBlacklist"("tenantId", "identifierType");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerBlacklist_tenantId_identifierType_identifierValue_key" ON "BorrowerBlacklist"("tenantId", "identifierType", "identifierValue");

-- CreateIndex
CREATE INDEX "RiskPolicy_tenantId_isActive_idx" ON "RiskPolicy"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RiskPolicy_tenantId_name_version_key" ON "RiskPolicy"("tenantId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RiskEvaluation_loanApplicationId_key" ON "RiskEvaluation"("loanApplicationId");

-- CreateIndex
CREATE INDEX "RiskEvaluation_tenantId_loanApplicationId_idx" ON "RiskEvaluation"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "RiskEvaluation_tenantId_borrowerId_idx" ON "RiskEvaluation"("tenantId", "borrowerId");

-- CreateIndex
CREATE INDEX "RiskEvaluation_tenantId_createdAt_idx" ON "RiskEvaluation"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InterestAccrualAudit_tenantId_createdAt_idx" ON "InterestAccrualAudit"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InterestAccrualAudit_loanApplicationId_createdAt_idx" ON "InterestAccrualAudit"("loanApplicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoanApplicationRiskAssessment_loanApplicationId_key" ON "LoanApplicationRiskAssessment"("loanApplicationId");

-- CreateIndex
CREATE INDEX "LoanApplicationRiskAssessment_tenantId_createdAt_idx" ON "LoanApplicationRiskAssessment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "LoanApplicationRiskAssessment_tenantId_decision_idx" ON "LoanApplicationRiskAssessment"("tenantId", "decision");

-- CreateIndex
CREATE INDEX "LoanApplicationRiskAssessmentHistory_tenantId_loanApplicati_idx" ON "LoanApplicationRiskAssessmentHistory"("tenantId", "loanApplicationId", "createdAt");

-- CreateIndex
CREATE INDEX "LoanApplicationHold_tenantId_loanApplicationId_idx" ON "LoanApplicationHold"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "LoanApplicationHold_tenantId_isActive_idx" ON "LoanApplicationHold"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "LoanRepaymentScheduleItem_tenantId_idx" ON "LoanRepaymentScheduleItem"("tenantId");

-- CreateIndex
CREATE INDEX "LoanRepaymentScheduleItem_loanApplicationId_idx" ON "LoanRepaymentScheduleItem"("loanApplicationId");

-- CreateIndex
CREATE INDEX "LoanRepaymentScheduleItem_tenantId_dueDate_idx" ON "LoanRepaymentScheduleItem"("tenantId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LoanRepaymentScheduleItem_loanApplicationId_installmentNumb_key" ON "LoanRepaymentScheduleItem"("loanApplicationId", "installmentNumber");

-- CreateIndex
CREATE INDEX "LoanRepayment_tenantId_idx" ON "LoanRepayment"("tenantId");

-- CreateIndex
CREATE INDEX "LoanRepayment_loanApplicationId_postedAt_idx" ON "LoanRepayment"("loanApplicationId", "postedAt");

-- CreateIndex
CREATE INDEX "LoanRepayment_tenantId_postedAt_idx" ON "LoanRepayment"("tenantId", "postedAt");

-- CreateIndex
CREATE INDEX "LoanRepayment_tenantId_createdAt_idx" ON "LoanRepayment"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoanRepayment_tenantId_idempotencyKey_key" ON "LoanRepayment"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "DelinquencyEvent_tenantId_idx" ON "DelinquencyEvent"("tenantId");

-- CreateIndex
CREATE INDEX "DelinquencyEvent_loanId_idx" ON "DelinquencyEvent"("loanId");

-- CreateIndex
CREATE INDEX "CollectionActivity_tenantId_idx" ON "CollectionActivity"("tenantId");

-- CreateIndex
CREATE INDEX "CollectionActivity_loanId_idx" ON "CollectionActivity"("loanId");

-- CreateIndex
CREATE INDEX "Case_tenantId_idx" ON "Case"("tenantId");

-- CreateIndex
CREATE INDEX "Case_tenantId_status_idx" ON "Case"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Case_tenantId_priority_idx" ON "Case"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "Case_tenantId_assignedToAdminUserId_idx" ON "Case"("tenantId", "assignedToAdminUserId");

-- CreateIndex
CREATE INDEX "Case_tenantId_borrowerId_idx" ON "Case"("tenantId", "borrowerId");

-- CreateIndex
CREATE INDEX "Case_tenantId_loanApplicationId_idx" ON "Case"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "Case_tenantId_slaDueAt_idx" ON "Case"("tenantId", "slaDueAt");

-- CreateIndex
CREATE INDEX "CaseMessage_tenantId_caseId_idx" ON "CaseMessage"("tenantId", "caseId");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_tenantId_caseId_createdAt_idx" ON "CaseStatusHistory"("tenantId", "caseId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionsCase_tenantId_status_idx" ON "CollectionsCase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CollectionsCase_tenantId_stage_idx" ON "CollectionsCase"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "CollectionsCase_tenantId_assignedToAdminUserId_status_idx" ON "CollectionsCase"("tenantId", "assignedToAdminUserId", "status");

-- CreateIndex
CREATE INDEX "CollectionsCase_tenantId_currentDpd_idx" ON "CollectionsCase"("tenantId", "currentDpd");

-- CreateIndex
CREATE INDEX "CollectionsCase_tenantId_loanAccountId_status_idx" ON "CollectionsCase"("tenantId", "loanAccountId", "status");

-- CreateIndex
CREATE INDEX "CollectionsAction_tenantId_caseId_createdAt_idx" ON "CollectionsAction"("tenantId", "caseId", "createdAt");

-- CreateIndex
CREATE INDEX "PenaltyRule_tenantId_productId_idx" ON "PenaltyRule"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "TenantPenaltyAccrual_tenantId_loanAccountId_createdAt_idx" ON "TenantPenaltyAccrual"("tenantId", "loanAccountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPenaltyAccrual_tenantId_loanAccountId_accruedForDate_key" ON "TenantPenaltyAccrual"("tenantId", "loanAccountId", "accruedForDate");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDisbursement_loanApplicationId_key" ON "TenantDisbursement"("loanApplicationId");

-- CreateIndex
CREATE INDEX "TenantDisbursement_tenantId_status_idx" ON "TenantDisbursement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TenantDisbursement_tenantId_loanApplicationId_idx" ON "TenantDisbursement"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "TenantDisbursement_tenantId_disbursedAt_idx" ON "TenantDisbursement"("tenantId", "disbursedAt");

-- CreateIndex
CREATE INDEX "TenantDisbursement_tenantId_createdAt_idx" ON "TenantDisbursement"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDisbursement_tenantId_idempotencyKey_key" ON "TenantDisbursement"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDisbursement_tenantId_providerReference_key" ON "TenantDisbursement"("tenantId", "providerReference");

-- CreateIndex
CREATE INDEX "CapitalPool_tenantId_idx" ON "CapitalPool"("tenantId");

-- CreateIndex
CREATE INDEX "CapitalPool_tenantId_status_idx" ON "CapitalPool"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CapitalPool_tenantId_createdAt_idx" ON "CapitalPool"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CapitalPoolBalanceSnapshot_tenantId_poolId_asOfDate_idx" ON "CapitalPoolBalanceSnapshot"("tenantId", "poolId", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "CapitalPoolBalanceSnapshot_poolId_asOfDate_key" ON "CapitalPoolBalanceSnapshot"("poolId", "asOfDate");

-- CreateIndex
CREATE INDEX "PortfolioDailySnapshot_tenantId_date_idx" ON "PortfolioDailySnapshot"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioDailySnapshot_tenantId_date_key" ON "PortfolioDailySnapshot"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CapitalAllocation_loanApplicationId_key" ON "CapitalAllocation"("loanApplicationId");

-- CreateIndex
CREATE INDEX "CapitalAllocation_tenantId_poolId_idx" ON "CapitalAllocation"("tenantId", "poolId");

-- CreateIndex
CREATE INDEX "CapitalAllocation_tenantId_loanApplicationId_idx" ON "CapitalAllocation"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "CapitalAllocation_tenantId_status_createdAt_idx" ON "CapitalAllocation"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CapitalAllocation_tenantId_loanApplicationId_key" ON "CapitalAllocation"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "TenantDisbursementStatusHistory_tenantId_createdAt_idx" ON "TenantDisbursementStatusHistory"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantDisbursementStatusHistory_disbursementId_createdAt_idx" ON "TenantDisbursementStatusHistory"("disbursementId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantDisbursementStatusHistory_loanId_createdAt_idx" ON "TenantDisbursementStatusHistory"("loanId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantLedgerAccount_tenantId_createdAt_idx" ON "TenantLedgerAccount"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantLedgerAccount_tenantId_code_key" ON "TenantLedgerAccount"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "TenantLedgerAccount_tenantId_name_key" ON "TenantLedgerAccount"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TenantLedgerEntry_tenantId_occurredAt_idx" ON "TenantLedgerEntry"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "TenantLedgerEntry_referenceType_referenceId_idx" ON "TenantLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "TenantLedgerEntry_tenantId_referenceType_referenceId_idx" ON "TenantLedgerEntry"("tenantId", "referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantLedgerEntry_tenantId_idempotencyKey_key" ON "TenantLedgerEntry"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "TenantLedgerLine_tenantId_createdAt_idx" ON "TenantLedgerLine"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantLedgerLine_entryId_idx" ON "TenantLedgerLine"("entryId");

-- CreateIndex
CREATE INDEX "TenantLedgerLine_accountId_idx" ON "TenantLedgerLine"("accountId");

-- CreateIndex
CREATE INDEX "TenantRepaymentSchedule_tenantId_dueDate_idx" ON "TenantRepaymentSchedule"("tenantId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "TenantRepaymentSchedule_loanApplicationId_installmentNo_key" ON "TenantRepaymentSchedule"("loanApplicationId", "installmentNo");

-- CreateIndex
CREATE INDEX "TenantRepayment_tenantId_paidAt_idx" ON "TenantRepayment"("tenantId", "paidAt");

-- CreateIndex
CREATE INDEX "TenantRepayment_loanApplicationId_paidAt_idx" ON "TenantRepayment"("loanApplicationId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantRepayment_tenantId_idempotencyKey_key" ON "TenantRepayment"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "LoanApplicationStatusHistory_tenantId_idx" ON "LoanApplicationStatusHistory"("tenantId");

-- CreateIndex
CREATE INDEX "LoanApplicationStatusHistory_loanApplicationId_idx" ON "LoanApplicationStatusHistory"("loanApplicationId");

-- CreateIndex
CREATE INDEX "LoanApplicationStatusHistory_loanApplicationId_changedAt_idx" ON "LoanApplicationStatusHistory"("loanApplicationId", "changedAt");

-- CreateIndex
CREATE INDEX "LoanApplicationStatusHistory_tenantId_loanApplicationId_cha_idx" ON "LoanApplicationStatusHistory"("tenantId", "loanApplicationId", "changedAt");

-- CreateIndex
CREATE INDEX "TenantLoanApplicationEvent_loanApplicationId_createdAt_idx" ON "TenantLoanApplicationEvent"("loanApplicationId", "createdAt");

-- CreateIndex
CREATE INDEX "TenantLoanApplicationEvent_adminId_createdAt_idx" ON "TenantLoanApplicationEvent"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "LoanProduct_tenantId_idx" ON "LoanProduct"("tenantId");

-- CreateIndex
CREATE INDEX "LoanProduct_tenantId_status_idx" ON "LoanProduct"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LoanProduct_tenantId_createdAt_idx" ON "LoanProduct"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "LoanProductFee_loanProductId_idx" ON "LoanProductFee"("loanProductId");

-- CreateIndex
CREATE INDEX "LoanProductVersion_tenantId_createdAt_idx" ON "LoanProductVersion"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoanProductVersion_loanProductId_version_key" ON "LoanProductVersion"("loanProductId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "UnderwritingCase_loanApplicationId_key" ON "UnderwritingCase"("loanApplicationId");

-- CreateIndex
CREATE INDEX "UnderwritingCase_lenderId_status_createdAt_idx" ON "UnderwritingCase"("lenderId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "UnderwritingCase_borrowerId_idx" ON "UnderwritingCase"("borrowerId");

-- CreateIndex
CREATE INDEX "UnderwritingChecklistItem_underwritingCaseId_status_idx" ON "UnderwritingChecklistItem"("underwritingCaseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UnderwritingChecklistItem_underwritingCaseId_code_key" ON "UnderwritingChecklistItem"("underwritingCaseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LoanOffer_loanApplicationId_key" ON "LoanOffer"("loanApplicationId");

-- CreateIndex
CREATE INDEX "LoanOffer_lenderId_status_idx" ON "LoanOffer"("lenderId", "status");

-- CreateIndex
CREATE INDEX "LoanOffer_borrowerId_idx" ON "LoanOffer"("borrowerId");

-- CreateIndex
CREATE INDEX "LoanOffer_status_idx" ON "LoanOffer"("status");

-- CreateIndex
CREATE INDEX "LoanOfferScheduleItem_loanOfferId_dueDate_idx" ON "LoanOfferScheduleItem"("loanOfferId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanOfferId_key" ON "Loan"("loanOfferId");

-- CreateIndex
CREATE INDEX "Loan_lenderId_status_idx" ON "Loan"("lenderId", "status");

-- CreateIndex
CREATE INDEX "Loan_borrowerId_status_idx" ON "Loan"("borrowerId", "status");

-- CreateIndex
CREATE INDEX "RepaymentScheduleItem_loanId_dueDate_idx" ON "RepaymentScheduleItem"("loanId", "dueDate");

-- CreateIndex
CREATE INDEX "BankAccount_borrowerId_isDefault_idx" ON "BankAccount"("borrowerId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_borrowerId_bankCode_accountNumber_key" ON "BankAccount"("borrowerId", "bankCode", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_loanId_key" ON "Disbursement"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_journalEntryId_key" ON "Disbursement"("journalEntryId");

-- CreateIndex
CREATE INDEX "Disbursement_lenderId_status_initiatedAt_idx" ON "Disbursement"("lenderId", "status", "initiatedAt");

-- CreateIndex
CREATE INDEX "Disbursement_bankAccountId_idx" ON "Disbursement"("bankAccountId");

-- CreateIndex
CREATE INDEX "Disbursement_status_initiatedAt_idx" ON "Disbursement"("status", "initiatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_lenderId_createdAt_idx" ON "Payment"("lenderId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_borrowerId_createdAt_idx" ON "Payment"("borrowerId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_loanId_status_idx" ON "Payment"("loanId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerRef_key" ON "Payment"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "PaymentIntent_tenantId_status_direction_idx" ON "PaymentIntent"("tenantId", "status", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_tenantId_idempotencyKey_key" ON "PaymentIntent"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_provider_providerReference_key" ON "PaymentIntent"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "BorrowerPayoutProfile_tenantId_createdAt_idx" ON "BorrowerPayoutProfile"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerPayoutProfile_tenantId_borrowerId_provider_key" ON "BorrowerPayoutProfile"("tenantId", "borrowerId", "provider");

-- CreateIndex
CREATE INDEX "PayoutIntent_tenantId_status_createdAt_idx" ON "PayoutIntent"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutIntent_tenantId_loanId_createdAt_idx" ON "PayoutIntent"("tenantId", "loanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutIntent_tenantId_idempotencyKey_key" ON "PayoutIntent"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutIntent_provider_providerTransferCode_key" ON "PayoutIntent"("provider", "providerTransferCode");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutIntent_provider_providerReference_key" ON "PayoutIntent"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "PaymentEvent_tenantId_intentId_idx" ON "PaymentEvent"("tenantId", "intentId");

-- CreateIndex
CREATE INDEX "PaymentEvent_tenantId_payoutId_idx" ON "PaymentEvent"("tenantId", "payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "PaymentIntentHistory_tenantId_intentId_createdAt_idx" ON "PaymentIntentHistory"("tenantId", "intentId", "createdAt");

-- CreateIndex
CREATE INDEX "ReconciliationRun_tenantId_type_status_idx" ON "ReconciliationRun"("tenantId", "type", "status");

-- CreateIndex
CREATE INDEX "ReconciliationRun_tenantId_startedAt_idx" ON "ReconciliationRun"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_tenantId_status_createdAt_idx" ON "ReconciliationRecord"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_tenantId_providerRef_idx" ON "ReconciliationRecord"("tenantId", "providerRef");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_tenantId_settlementBatchId_idx" ON "ReconciliationRecord"("tenantId", "settlementBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationRecord_tenantId_provider_referenceType_refere_key" ON "ReconciliationRecord"("tenantId", "provider", "referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "ReconciliationResolutionHistory_reconciliationId_createdAt_idx" ON "ReconciliationResolutionHistory"("reconciliationId", "createdAt");

-- CreateIndex
CREATE INDEX "SettlementBatch_tenantId_status_settlementDate_idx" ON "SettlementBatch"("tenantId", "status", "settlementDate");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementBatch_tenantId_provider_settlementDate_key" ON "SettlementBatch"("tenantId", "provider", "settlementDate");

-- CreateIndex
CREATE INDEX "ReconciliationJobRun_tenantId_createdAt_idx" ON "ReconciliationJobRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ReconciliationJobRun_tenantId_status_startedAt_idx" ON "ReconciliationJobRun"("tenantId", "status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationJobRun_tenantId_provider_dateFrom_dateTo_key" ON "ReconciliationJobRun"("tenantId", "provider", "dateFrom", "dateTo");

-- CreateIndex
CREATE INDEX "ReconciliationIssue_tenantId_status_idx" ON "ReconciliationIssue"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationIssue_tenantId_providerRef_idx" ON "ReconciliationIssue"("tenantId", "providerRef");

-- CreateIndex
CREATE INDEX "ReconciliationIssue_runId_idx" ON "ReconciliationIssue"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationIssue_tenantId_category_entityType_entityId_p_key" ON "ReconciliationIssue"("tenantId", "category", "entityType", "entityId", "providerRef", "expectedHash");

-- CreateIndex
CREATE UNIQUE INDEX "LoanBalance_loanId_key" ON "LoanBalance"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "Repayment_paymentId_key" ON "Repayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Repayment_journalEntryId_key" ON "Repayment"("journalEntryId");

-- CreateIndex
CREATE INDEX "Repayment_loanId_createdAt_idx" ON "Repayment"("loanId", "createdAt");

-- CreateIndex
CREATE INDEX "RepaymentAllocation_repaymentId_idx" ON "RepaymentAllocation"("repaymentId");

-- CreateIndex
CREATE INDEX "RepaymentAllocation_bucket_idx" ON "RepaymentAllocation"("bucket");

-- CreateIndex
CREATE UNIQUE INDEX "PenaltyAccrual_journalEntryId_key" ON "PenaltyAccrual"("journalEntryId");

-- CreateIndex
CREATE INDEX "PenaltyAccrual_loanId_createdAt_idx" ON "PenaltyAccrual"("loanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PenaltyAccrual_loanId_accrualDate_key" ON "PenaltyAccrual"("loanId", "accrualDate");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_createdAt_idx" ON "WebhookEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_providerEventId_idx" ON "WebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_eventType_createdAt_idx" ON "WebhookEvent"("provider", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_reference_createdAt_idx" ON "WebhookEvent"("provider", "reference", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_paymentId_idx" ON "WebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "LedgerAccount_type_isActive_idx" ON "LedgerAccount"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_tenantId_code_key" ON "LedgerAccount"("tenantId", "code");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_createdAt_idx" ON "JournalEntry"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_postedAt_idx" ON "JournalEntry"("postedAt");

-- CreateIndex
CREATE INDEX "JournalEntry_reference_idx" ON "JournalEntry"("reference");

-- CreateIndex
CREATE INDEX "JournalEntry_requestId_idx" ON "JournalEntry"("requestId");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_createdAt_idx" ON "JournalLine"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- CreateIndex
CREATE INDEX "JournalLine_ledgerAccountId_idx" ON "JournalLine"("ledgerAccountId");

-- CreateIndex
CREATE INDEX "JournalLine_entryType_idx" ON "JournalLine"("entryType");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAdminUser" ADD CONSTRAINT "TenantAdminUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAggregate" ADD CONSTRAINT "DailyAggregate_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Borrower" ADD CONSTRAINT "Borrower_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerRiskProfile" ADD CONSTRAINT "BorrowerRiskProfile_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerRiskProfile" ADD CONSTRAINT "BorrowerRiskProfile_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlacklistEntry" ADD CONSTRAINT "BlacklistEntry_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerNote" ADD CONSTRAINT "BorrowerNote_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerNote" ADD CONSTRAINT "BorrowerNote_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerNote" ADD CONSTRAINT "BorrowerNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerOverride" ADD CONSTRAINT "BorrowerOverride_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerOverride" ADD CONSTRAINT "BorrowerOverride_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerOverride" ADD CONSTRAINT "BorrowerOverride_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerDevice" ADD CONSTRAINT "BorrowerDevice_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_borrowerDeviceId_fkey" FOREIGN KEY ("borrowerDeviceId") REFERENCES "BorrowerDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowerProfile" ADD CONSTRAINT "BorrowerProfile_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycCase" ADD CONSTRAINT "KycCase_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycCase" ADD CONSTRAINT "KycCase_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_kycCaseId_fkey" FOREIGN KEY ("kycCaseId") REFERENCES "KycCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInviteToken" ADD CONSTRAINT "AdminInviteToken_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLoanApplication" ADD CONSTRAINT "TenantLoanApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardshipRequest" ADD CONSTRAINT "HardshipRequest_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardshipStatusHistory" ADD CONSTRAINT "HardshipStatusHistory_hardshipRequestId_fkey" FOREIGN KEY ("hardshipRequestId") REFERENCES "HardshipRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanDecisionEvent" ADD CONSTRAINT "LoanDecisionEvent_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSignalEvent" ADD CONSTRAINT "FraudSignalEvent_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlertSignal" ADD CONSTRAINT "FraudAlertSignal_fraudAlertId_fkey" FOREIGN KEY ("fraudAlertId") REFERENCES "FraudAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlertSignal" ADD CONSTRAINT "FraudAlertSignal_fraudSignalId_fkey" FOREIGN KEY ("fraudSignalId") REFERENCES "FraudSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvaluation" ADD CONSTRAINT "RiskEvaluation_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvaluation" ADD CONSTRAINT "RiskEvaluation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "RiskPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestAccrualAudit" ADD CONSTRAINT "InterestAccrualAudit_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplicationRiskAssessment" ADD CONSTRAINT "LoanApplicationRiskAssessment_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplicationRiskAssessmentHistory" ADD CONSTRAINT "LoanApplicationRiskAssessmentHistory_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplicationHold" ADD CONSTRAINT "LoanApplicationHold_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepaymentScheduleItem" ADD CONSTRAINT "LoanRepaymentScheduleItem_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelinquencyEvent" ADD CONSTRAINT "DelinquencyEvent_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionActivity" ADD CONSTRAINT "CollectionActivity_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_repaymentId_fkey" FOREIGN KEY ("repaymentId") REFERENCES "LoanRepayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionsCase" ADD CONSTRAINT "CollectionsCase_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionsAction" ADD CONSTRAINT "CollectionsAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CollectionsCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyRule" ADD CONSTRAINT "PenaltyRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LoanProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPenaltyAccrual" ADD CONSTRAINT "TenantPenaltyAccrual_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDisbursement" ADD CONSTRAINT "TenantDisbursement_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalPoolBalanceSnapshot" ADD CONSTRAINT "CapitalPoolBalanceSnapshot_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CapitalPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalAllocation" ADD CONSTRAINT "CapitalAllocation_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CapitalPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalAllocation" ADD CONSTRAINT "CapitalAllocation_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDisbursementStatusHistory" ADD CONSTRAINT "TenantDisbursementStatusHistory_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "TenantDisbursement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDisbursementStatusHistory" ADD CONSTRAINT "TenantDisbursementStatusHistory_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLedgerLine" ADD CONSTRAINT "TenantLedgerLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TenantLedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLedgerLine" ADD CONSTRAINT "TenantLedgerLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TenantLedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRepaymentSchedule" ADD CONSTRAINT "TenantRepaymentSchedule_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRepayment" ADD CONSTRAINT "TenantRepayment_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplicationStatusHistory" ADD CONSTRAINT "LoanApplicationStatusHistory_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLoanApplicationEvent" ADD CONSTRAINT "TenantLoanApplicationEvent_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLoanApplicationEvent" ADD CONSTRAINT "TenantLoanApplicationEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "TenantAdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanProduct" ADD CONSTRAINT "LoanProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanProductFee" ADD CONSTRAINT "LoanProductFee_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "LoanProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanProductVersion" ADD CONSTRAINT "LoanProductVersion_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "LoanProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnderwritingCase" ADD CONSTRAINT "UnderwritingCase_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnderwritingCase" ADD CONSTRAINT "UnderwritingCase_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnderwritingCase" ADD CONSTRAINT "UnderwritingCase_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnderwritingCase" ADD CONSTRAINT "UnderwritingCase_decidedByAdminId_fkey" FOREIGN KEY ("decidedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnderwritingChecklistItem" ADD CONSTRAINT "UnderwritingChecklistItem_underwritingCaseId_fkey" FOREIGN KEY ("underwritingCaseId") REFERENCES "UnderwritingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOffer" ADD CONSTRAINT "LoanOffer_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOffer" ADD CONSTRAINT "LoanOffer_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOffer" ADD CONSTRAINT "LoanOffer_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanOfferScheduleItem" ADD CONSTRAINT "LoanOfferScheduleItem_loanOfferId_fkey" FOREIGN KEY ("loanOfferId") REFERENCES "LoanOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_loanOfferId_fkey" FOREIGN KEY ("loanOfferId") REFERENCES "LoanOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentScheduleItem" ADD CONSTRAINT "RepaymentScheduleItem_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutIntent" ADD CONSTRAINT "PayoutIntent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutIntent" ADD CONSTRAINT "PayoutIntent_recipientProfileId_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "BorrowerPayoutProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "PayoutIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntentHistory" ADD CONSTRAINT "PaymentIntentHistory_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_settlementBatchId_fkey" FOREIGN KEY ("settlementBatchId") REFERENCES "SettlementBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationResolutionHistory" ADD CONSTRAINT "ReconciliationResolutionHistory_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "ReconciliationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationIssue" ADD CONSTRAINT "ReconciliationIssue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanBalance" ADD CONSTRAINT "LoanBalance_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repayment" ADD CONSTRAINT "Repayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repayment" ADD CONSTRAINT "Repayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repayment" ADD CONSTRAINT "Repayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepaymentAllocation" ADD CONSTRAINT "RepaymentAllocation_repaymentId_fkey" FOREIGN KEY ("repaymentId") REFERENCES "Repayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyAccrual" ADD CONSTRAINT "PenaltyAccrual_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyAccrual" ADD CONSTRAINT "PenaltyAccrual_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

