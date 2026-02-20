'use client';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';

const ACCESS_TOKEN_KEY = 'admin_access_token';

let memoryToken: string | null = null;

function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return memoryToken;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return memoryToken ?? getStoredToken();
}

export function setAccessToken(token: string | null): void {
  memoryToken = token;
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export type AdminLoginInput = {
  email: string;
  password: string;
  tenantSlug: string;
};

export type AdminLoginResponse = {
  accessToken: string;
  refreshToken?: string;
  admin?: {
    id: string;
    email: string;
    tenantId?: string | null;
    lenderId?: string | null;
    role:
      | 'CREDIT_OFFICER'
      | 'RISK_MANAGER'
      | 'OPS'
      | 'COLLECTIONS'
      | 'SYSTEM'
      | 'SUPER_ADMIN'
      | 'TENANT_ADMIN'
      | 'OWNER'
      | 'FINANCE'
      | 'VIEWER'
      | 'PLATFORM_SUPER_ADMIN';
  };
};

export type AdminActorRole = NonNullable<AdminLoginResponse['admin']>['role'];
export type TenantAdminRole =
  | 'CREDIT_OFFICER'
  | 'RISK_MANAGER'
  | 'OPS'
  | 'COLLECTIONS'
  | 'SYSTEM'
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN';

export type TenantAdminUserItem = {
  id: string;
  tenantId: string;
  email: string;
  role: TenantAdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminLoanApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REQUESTED_DOCUMENTS'
  | 'APPROVED'
  | 'READY_FOR_DISBURSEMENT'
  | 'DISBURSED'
  | 'OVERDUE'
  | 'WRITTEN_OFF'
  | 'SETTLED'
  | 'REPAID'
  | 'DEFAULTED'
  | 'REJECTED';

export type DelinquencyStatus = 'CURRENT' | 'OVERDUE' | 'CHARGED_OFF';

export type AdminLoanApplication = {
  id: string;
  status: AdminLoanApplicationStatus;
  delinquencyStatus?: DelinquencyStatus;
  daysPastDue?: number;
  overdueAmountCents?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AdminLoanApplicationDetail = AdminLoanApplication & {
  requestedAmount?: string;
  approvedAmount?: string | null;
  disbursedAmount?: string | null;
  outstandingPrincipal?: string;
  outstandingInterest?: string;
  outstandingFees?: string;
  totalOutstanding?: string;
  delinquencyStatus?: DelinquencyStatus;
  daysPastDue?: number;
  overdueAmountCents?: string;
  lastDelinquencyCalcAt?: string | null;
  annualInterestRate?: string | null;
  interestAccrualPaused?: boolean;
  interestPausedAt?: string | null;
  interestPausedById?: string | null;
  interestPauseReason?: string | null;
  interestOverrideRate?: string | null;
  interestOverrideSetAt?: string | null;
  interestOverrideSetById?: string | null;
  lastAccruedAt?: string | null;
  disbursement?: {
    id: string;
    amount: string;
    currency: string;
    method: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
    provider?: string | null;
    providerReference?: string | null;
    reference?: string | null;
    disbursedAt?: string | null;
    processedAt?: string | null;
    failureReason?: string | null;
    idempotencyKey?: string;
  } | null;
  repayments?: Array<{
    id: string;
    amount: string;
    currency: string;
    method: string;
    reference?: string | null;
    paidAt: string;
  }>;
  schedule?: Array<{
    id: string;
    installmentNo: number;
    dueDate: string;
    principalDue: string;
    interestDue: string;
    feesDue: string;
    totalDue: string;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
    paidAt?: string | null;
    isOverdue?: boolean;
    overdueSince?: string | null;
    remainingAmountCents?: string;
  }>;
  ledgerEntries?: Array<{
    id: string;
    type: 'DISBURSEMENT' | 'REPAYMENT' | 'ACCRUAL' | 'ADJUSTMENT';
    occurredAt: string;
    idempotencyKey: string;
    memo?: string | null;
    lines: Array<{
      id: string;
      accountCode: string;
      direction: 'DEBIT' | 'CREDIT';
      amount: string;
    }>;
  }>;
  histories?: Array<{
    id: string;
    tenantId: string;
    loanApplicationId: string;
    fromStatus: AdminLoanApplicationStatus | null;
    toStatus: AdminLoanApplicationStatus;
    note?: string | null;
    changedByUserId?: string | null;
    changedAt: string;
  }>;
  collectionActivities?: Array<{
    id: string;
    actionType: string;
    note: string | null;
    performedBy: string;
    createdAt: string;
  }>;
  interestAccrualAudits?: Array<{
    id: string;
    action: 'PAUSED' | 'RESUMED' | 'RATE_OVERRIDE_SET' | 'RATE_OVERRIDE_REMOVED';
    previousRate: string | null;
    newRate: string | null;
    reason: string | null;
    performedById: string;
    createdAt: string;
  }>;
  decisionEvents?: Array<{
    id: string;
    decision: 'APPROVE' | 'MANUAL_REVIEW' | 'DECLINE';
    reasonCodes: string[];
    actorType: 'SYSTEM' | 'ADMIN';
    actorId: string | null;
    actorRole: string | null;
    createdAt: string;
    inputsJson: unknown;
    recommendedLimit: string | null;
    recommendedTenorDays: number | null;
  }>;
  fraudSignals?: Array<{
    id: string;
    signalType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    metadataJson: unknown;
    createdAt: string;
  }>;
  fraudAlerts?: Array<{
    id: string;
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ESCALATED';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    autoGenerated: boolean;
    resolutionNotes: string | null;
    resolvedAt: string | null;
    createdAt: string;
  }>;
  identityVerification?: {
    id: string;
    provider: string;
    status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';
    matchScore: number | null;
    riskFlags: unknown;
    createdAt: string;
  } | null;
  [key: string]: unknown;
};

export type FraudAlertStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ESCALATED';
export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FraudAlertListItem = {
  id: string;
  tenantId: string;
  borrowerId: string | null;
  loanApplicationId: string | null;
  status: FraudAlertStatus;
  severity: FraudSeverity;
  autoGenerated: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FraudAlertDetail = FraudAlertListItem & {
  signals: Array<{
    id: string;
    type: string;
    severity: FraudSeverity;
    scoreImpact: number;
    metadataJson: unknown;
    createdAt: string;
  }>;
};

export type BorrowerFraudLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';

export type FraudQueueItem = {
  id: string;
  tenantId: string;
  borrowerId: string;
  borrowerName: string | null;
  borrowerPhone: string;
  riskScore: number;
  fraudLevel: BorrowerFraudLevel;
  flags: string[];
  lastEvaluatedAt: string | null;
  updatedAt: string;
};

export type FraudBorrowerDetail = {
  aggregate: {
    id: string;
    tenantId: string;
    borrowerId: string;
    riskScore: number;
    fraudLevel: BorrowerFraudLevel;
    flags: string[];
    lastEvaluatedAt: string | null;
    updatedAt: string;
  };
  borrower: {
    id: string;
    fullName: string | null;
    phone: string;
    email: string | null;
  };
  recentEvents: Array<{
    id: string;
    type: string;
    severity: FraudSeverity;
    source: string;
    scoreImpact: number;
    metadataJson: unknown;
    createdAt: string;
  }>;
  holds: Array<{
    id: string;
    status: 'ACTIVE' | 'RELEASED';
    reason: string;
    createdByAdminId: string | null;
    createdBySystem: boolean;
    releasedAt: string | null;
    releaseReason: string | null;
    createdAt: string;
  }>;
  counters: {
    failedLogins1h: number;
    paymentAttempts24h: number;
    bankChanges7d: number;
    deviceChanges14d: number;
  };
};

export type RiskDecision = 'APPROVE' | 'REVIEW' | 'DECLINE';
export type RiskHoldType =
  | 'FRAUD_SUSPECTED'
  | 'KYC_MISSING'
  | 'DOCUMENTS_MISSING'
  | 'POLICY_VIOLATION'
  | 'MANUAL_REVIEW'
  | 'COLLECTIONS_REVIEW'
  | 'SYSTEM_VELOCITY';

export type LoanRiskView = {
  assessment: {
    score: number;
    decision: RiskDecision;
    reasons: Array<{ code: string; message: string; data?: Record<string, unknown> }>;
    createdByAdminId: string | null;
    createdAt: string | null;
    overrideEnabled: boolean;
  };
  activeHolds: Array<{
    id: string;
    type: RiskHoldType;
    note: string | null;
    isActive: boolean;
    createdAt: string;
    createdByAdminId: string;
    resolvedAt: string | null;
    resolvedByAdminId: string | null;
    resolutionNote: string | null;
  }>;
  history: Array<{
    id: string;
    score: number;
    decision: RiskDecision;
    reasons: Array<{ code: string; message: string; data?: Record<string, unknown> }>;
    createdAt: string;
    createdByAdminId: string | null;
  }>;
};

export type RiskPolicy = {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  configJson: unknown;
};

export type RiskEvaluationItem = {
  id: string;
  trigger: 'AUTO_ON_SUBMISSION' | 'MANUAL_ADMIN' | 'SYSTEM_REEVAL';
  score: number;
  decision: RiskDecision;
  reasonsJson: unknown;
  inputSnapshotJson: unknown;
  createdAt: string;
  createdBy: string | null;
};

export type AdminAuditItem = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorType: string | null;
  actorRole: string | null;
};

export type AuditTrailEvent = {
  id: string;
  createdAt: string;
  action: string;
  actorType: string | null;
  actorRole: string | null;
  actorId: string | null;
  tenantId: string | null;
  entityType: string;
  entityId: string;
  metadataJson: unknown;
};

export type AdminAuditExplorerItem = {
  id: string;
  createdAt: string;
  actorType: 'BORROWER' | 'TENANT_ADMIN' | 'SYSTEM' | null;
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  status: 'SUCCESS' | 'FAIL';
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
  summary: string | null;
};

export type AdminAuditDetail = AdminAuditExplorerItem & {
  actorRole: string | null;
  metadata: unknown;
  before: unknown;
  after: unknown;
  error: unknown;
};

export type SuspiciousActivityItem = {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  createdAt: string;
  resolved: boolean;
  resolvedBy: string | null;
};

export type SuspiciousActivityPage = {
  items: SuspiciousActivityItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type LoanForensicReport = {
  loan: Record<string, unknown>;
  statusHistory: Array<Record<string, unknown>>;
  disbursements: Array<Record<string, unknown>>;
  repayments: Array<Record<string, unknown>>;
  ledgerEntries: Array<Record<string, unknown>>;
  auditTrail: Array<Record<string, unknown>>;
  riskEvents: Array<Record<string, unknown>>;
  treasuryAllocations: Array<Record<string, unknown>>;
  timeline: Array<{ kind: string; at: string; id: string }>;
};

export type NotificationAudienceType = 'BORROWER' | 'ADMIN';
export type NotificationDeliveryChannel = 'IN_APP' | 'EMAIL' | 'SMS';
export type NotificationRecordStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'READ';

export type NotificationItem = {
  id: string;
  audienceType: NotificationAudienceType;
  audienceUserId: string;
  channel: NotificationDeliveryChannel;
  templateKey: string;
  title: string;
  body: string;
  dataJson: unknown;
  status: NotificationRecordStatus;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
};

export type AdminMetricsResponse = {
  tenantId: string;
  generatedAt: string;
  counters: Record<
    | 'loan_application_submitted_total'
    | 'loan_application_approved_total'
    | 'disbursement_executed_total'
    | 'repayment_applied_total'
    | 'transition_failed_total'
    | 'idempotency_conflict_total',
    { total: number; last24h: number }
  >;
  latency: Record<
    | 'disbursement_execution_latency_ms'
    | 'repayment_application_latency_ms'
    | 'transition_execution_latency_ms',
    { count: number; avgMs: number; p95Ms: number; last24hCount: number; last24hAvgMs: number }
  >;
};

export type AdminSystemStatusResponse = {
  status: 'green' | 'yellow' | 'red';
  health: {
    database: 'up' | 'down';
    pendingDisbursements: number;
    stuckTransitions: number;
    pausedInterest: number;
    ledgerImbalanceCount: number;
  };
  criticalAuditEvents: Array<{
    id: string;
    createdAt: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
  }>;
  failedIdempotencyKeys: number;
  activeLoanAccounts: number;
  overdueAccounts: number;
  totalDisbursedAmount: string;
  totalRepaymentsAmount: string;
};

export type DashboardMetricsResponse = {
  totals: {
    totalLoanVolume: number;
    activeLoans: number;
    portfolioOutstanding: number;
    par30: number;
    totalInterestEarned: number;
    defaultRate: number;
  };
  snapshots: {
    asOf: string;
  };
};

export type DashboardActivityType =
  | 'LOAN_SUBMITTED'
  | 'LOAN_APPROVED'
  | 'LOAN_DISBURSED'
  | 'REPAYMENT_RECEIVED'
  | 'LOAN_DEFAULTED';

export type DashboardActivityItem = {
  id: string;
  type: DashboardActivityType;
  title: string;
  createdAt: string;
  loanApplicationId?: string;
  amount?: number;
};

export type PortfolioKpisResponse = {
  asOf: string;
  activeLoansCount: number;
  totalDisbursed: number;
  totalPrincipalOutstanding: number;
  totalInterestAccrued: number;
  totalRepaid: number;
  overdueAmount: number;
  par30Amount: number;
  par90Amount: number;
  par30Rate: number;
  par90Rate: number;
  defaultRate: number;
  recoveryRate: number;
  avgDaysPastDue: number;
};

export type PortfolioTrendsResponse = {
  days: number;
  disbursements: Array<{ date: string; amount: number }>;
  repayments: Array<{ date: string; amount: number }>;
  applications: Array<{ date: string; submitted: number; approved: number; rejected: number }>;
  delinquencyBuckets: {
    current: number;
    dpd1_30: number;
    dpd31_60: number;
    dpd61_90: number;
    dpd90plus: number;
  };
};

export type PortfolioSummaryResponse = {
  asOf: string;
  activeLoanCount: number;
  totalOutstandingPrincipal: number;
  totalOutstandingInterest: number;
  totalOutstandingFees: number;
  totalOutstandingTotal: number;
  disbursedTodayAmount: number;
  disbursedThisWeekAmount: number;
  disbursedThisMonthAmount: number;
  repaymentsTodayAmount: number;
  repaymentsThisWeekAmount: number;
  repaymentsThisMonthAmount: number;
};

export type PortfolioParBucket = {
  bucket: 'PAR_1_7' | 'PAR_8_30' | 'PAR_31_60' | 'PAR_61_90' | 'PAR_90_PLUS';
  count: number;
  outstandingAmount: number;
};

export type PortfolioParResponse = {
  asOf: string;
  buckets: PortfolioParBucket[];
  par30: number;
  par90: number;
};

export type PortfolioDelinquencyResponse = {
  asOf: string;
  nplRatio: number;
  par30Ratio: number;
  totalOutstanding: number;
  par30Outstanding: number;
  par90Outstanding: number;
};

export type PortfolioVintageResponse = {
  months: number;
  items: Array<{
    cohortMonth: string;
    disbursedCount: number;
    disbursedAmount: number;
    delinquent30Amount: number;
    delinquent90Amount: number;
  }>;
};

export type PortfolioCollectionsResponse = {
  days: number;
  items: Array<{
    date: string;
    dueAmount: number;
    collectedAmount: number;
    collectionRate: number;
  }>;
};

export type PortfolioTreasuryExposureResponse = {
  asOf: string;
  pools: Array<{
    poolId: string;
    poolName: string;
    type: string;
    status: string;
    totalCommitted: number;
    totalReserved: number;
    availableLiquidity: number;
  }>;
  totals: {
    committed: number;
    reserved: number;
    availableLiquidity: number;
  };
};

export type CapitalPoolType = 'TREASURY' | 'INVESTOR' | 'CREDIT_LINE';
export type CapitalPoolStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type CapitalAllocationStatus = 'RESERVED' | 'DEPLOYED' | 'RELEASED' | 'WRITTEN_OFF';

export type TreasuryPool = {
  id: string;
  tenantId: string;
  name: string;
  type: CapitalPoolType;
  status: CapitalPoolStatus;
  currency: string;
  externalRef: string | null;
  rulesJson: unknown;
  createdAt: string;
  updatedAt: string;
};

export type TreasuryPoolSummary = {
  available: string;
  deployed: string;
  repaid: string;
  losses: string;
  utilizationPct: number;
  asOf: string;
};

export type TreasuryPoolPerformance = {
  totalDisbursed: string;
  totalPrincipalRepaid: string;
  totalDefaultsAmount: string;
};

export type TreasuryAllocation = {
  id: string;
  tenantId: string;
  poolId: string;
  loanApplicationId: string;
  status: CapitalAllocationStatus;
  reservedAmount: string;
  deployedAmount: string;
  releasedAmount: string;
  writtenOffAmount: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminJobStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTER';
export type AdminJobType =
  | 'ACCRUE_INTEREST'
  | 'RECALC_BALANCES'
  | 'SEND_NOTIFICATION'
  | 'COLLECTIONS_ESCALATION'
  | 'RISK_REEVALUATION'
  | 'LEDGER_RECONCILE';

export type AdminJobItem = {
  id: string;
  type: AdminJobType;
  status: AdminJobStatus;
  tenantId: string;
  lenderId: string | null;
  dedupeKey: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  lastError: string | null;
  succeededAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OpsJobStatus = 'waiting' | 'active' | 'completed' | 'failed';

export type OpsJobItem = {
  id: string;
  name: string;
  status: OpsJobStatus;
  attemptsMade: number;
  attemptsMax: number;
  timestamp: string;
  finishedOn: string | null;
  failedReason: string | null;
  requestId: string | null;
  tenantId: string;
};

export type OpsJobDetail = {
  id: string;
  name: string;
  queue: string;
  data: Record<string, unknown>;
  opts: {
    runAt: string;
    maxAttempts: number;
    backoffMs: number;
  };
  status: OpsJobStatus;
  logsMeta: {
    requestId: string | null;
    tenantId: string;
    lockedBy: string | null;
    lockedAt: string | null;
  };
  stacktrace: string[];
  timestamps: {
    createdAt: string;
    updatedAt: string;
    runAt: string;
    succeededAt: string | null;
    failedAt: string | null;
  };
};

export type ListAdminLoanApplicationsInput = {
  status?: AdminLoanApplicationStatus;
  queue?: 'OVERDUE';
};

export type SetLoanApplicationStatusInput = {
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
};

export type TransitionLoanApplicationInput = {
  toStatus: AdminLoanApplicationStatus;
  note?: string;
};

export type DisburseLoanInput = {
  method?: 'BANK_TRANSFER' | 'WALLET' | 'MANUAL' | 'CASH';
  idempotencyKey?: string;
  note?: string;
  forceFail?: boolean;
};

export type RepayLoanInput = {
  amount: number;
  method?: 'BANK_TRANSFER' | 'CARD' | 'WALLET' | 'CASH';
  channel?: 'MANUAL' | 'BANK_TRANSFER' | 'CARD' | 'USSD' | 'CASH';
  idempotencyKey?: string;
  reference?: string;
  paidAt?: string;
  postedAt?: string;
};

export type AccrueInterestInput = {
  throughDate: string;
};
export type PauseInterestInput = {
  reason?: string;
};
export type SetInterestOverrideInput = {
  rate: number;
  reason?: string;
};
export type RemoveInterestOverrideInput = {
  reason?: string;
};

export type GenerateScheduleInput = {
  interestMethod?: 'REDUCING_BALANCE' | 'FLAT';
};

export type LoanScheduleItem = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  totalDue: string;
  totalPaid: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  isOverdue: boolean;
  overdueSince: string | null;
  remainingAmountCents: string;
};

export type LoanRepaymentRow = {
  id: string;
  amount: string;
  currency: string;
  postedAt: string;
  channel: 'MANUAL' | 'BANK_TRANSFER' | 'CARD' | 'USSD' | 'CASH';
  reference: string | null;
};

export type CollectionBucket = 'CURRENT' | 'DPD_1_30' | 'DPD_31_60' | 'DPD_61_90' | 'DPD_90_PLUS';

export type CollectionQueueItem = {
  id: string;
  borrowerName: string;
  dpd: number;
  bucket: CollectionBucket;
  status: AdminLoanApplicationStatus;
  outstandingBalance: string;
  totalPenaltyAccrued: string;
};

export type CollectionsCaseStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PROMISE_TO_PAY'
  | 'BROKEN_PTP'
  | 'RESOLVED'
  | 'CLOSED'
  | 'WRITTEN_OFF';
export type CollectionsStage = 'SOFT' | 'FIELD' | 'LEGAL';
export type CollectionsCaseActionType =
  | 'CALL'
  | 'SMS'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'VISIT'
  | 'NOTE'
  | 'PTP_SET'
  | 'PTP_BROKEN'
  | 'DISPUTE'
  | 'WAIVER'
  | 'WRITE_OFF'
  | 'OTHER';

export type CollectionsCaseListItem = {
  id: string;
  loanAccountId: string;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string;
  status: CollectionsCaseStatus;
  stage: CollectionsStage;
  currentDpd: number;
  currentOutstanding: string;
  assignedToAdminUserId: string | null;
  lastContactAt: string | null;
  nextActionAt: string | null;
  updatedAt: string;
};

export type CollectionsCaseDetail = {
  id: string;
  tenantId: string;
  loanAccountId: string;
  borrowerId: string;
  status: CollectionsCaseStatus;
  stage: CollectionsStage;
  currentDpd: number;
  currentOutstanding: string;
  assignedToAdminUserId: string | null;
  promiseToPayAt: string | null;
  lastContactAt: string | null;
  nextActionAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  actions: Array<{
    id: string;
    type: CollectionsCaseActionType;
    note: string;
    actorAdminUserId: string | null;
    createdAt: string;
    metadata?: unknown;
  }>;
  loanAccount: {
    id: string;
    fullName: string;
    phone: string;
    status: AdminLoanApplicationStatus;
    outstandingPrincipal: string;
    outstandingInterest: string;
    outstandingFees: string;
    outstandingTotal: string;
    daysPastDue: number;
  };
};

export type CaseType = 'COMPLAINT' | 'DISPUTE' | 'REQUEST';
export type CaseStatus = 'OPEN' | 'IN_REVIEW' | 'AWAITING_BORROWER' | 'ESCALATED' | 'RESOLVED' | 'REJECTED' | 'CLOSED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CaseResolutionCode =
  | 'REFUND_ISSUED'
  | 'WAIVER_GRANTED'
  | 'PAYMENT_REVERSED'
  | 'CORRECTION_MADE'
  | 'NO_ACTION_REQUIRED'
  | 'FRAUD_CONFIRMED'
  | 'FRAUD_NOT_CONFIRMED'
  | 'OTHER';

export type CaseListItem = {
  id: string;
  tenantId: string;
  borrowerId: string | null;
  loanApplicationId: string | null;
  repaymentId: string | null;
  disbursementId: string | null;
  type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  subject: string;
  description: string;
  assignedToAdminUserId: string | null;
  slaDueAt: string | null;
  resolutionCode: CaseResolutionCode | null;
  resolutionNotes: string | null;
  createdByAdminUserId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type CaseDetail = CaseListItem & {
  messages: Array<{
    id: string;
    tenantId: string;
    caseId: string;
    visibility: 'INTERNAL' | 'BORROWER';
    message: string;
    createdByAdminUserId: string | null;
    createdByBorrowerId: string | null;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    tenantId: string;
    caseId: string;
    fromStatus: CaseStatus | null;
    toStatus: CaseStatus;
    changedByAdminUserId: string | null;
    reason: string | null;
    createdAt: string;
  }>;
};

export type SupportCaseStatus = 'OPEN' | 'CLOSED';
export type SupportActionType =
  | 'PAUSE_INTEREST'
  | 'RESUME_INTEREST'
  | 'APPLY_WAIVER'
  | 'APPLY_FEE'
  | 'RESCHEDULE_PLAN'
  | 'LEDGER_REVERSAL'
  | 'NOTE';
export type SupportActionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED' | 'CANCELED';
export type SupportRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SupportNote = {
  id: string;
  caseId: string;
  tenantId: string;
  createdById: string;
  body: string;
  evidenceUrl: string | null;
  createdAt: string;
};

export type SupportAction = {
  id: string;
  caseId: string;
  tenantId: string;
  type: SupportActionType;
  risk: SupportRiskLevel;
  status: SupportActionStatus;
  payloadJson: Record<string, unknown>;
  reason: string;
  requestedById: string;
  approvedById: string | null;
  executedById: string | null;
  rejectedById: string | null;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  executedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
};

export type SupportCase = {
  id: string;
  tenantId: string;
  loanId: string | null;
  borrowerId: string | null;
  title: string;
  status: SupportCaseStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportCaseDetail = SupportCase & {
  actions: SupportAction[];
  notes: SupportNote[];
};

export type PaymentDirection = 'INBOUND' | 'OUTBOUND';
export type PaymentIntentStatus = 'CREATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
export type MandateStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';

export type AdminPaymentIntent = {
  id: string;
  tenantId: string;
  direction: PaymentDirection;
  provider: 'PAYSTACK';
  status: PaymentIntentStatus;
  currency: string;
  amountMinor: number;
  feeMinor: number | null;
  netMinor: number | null;
  loanId: string | null;
  disbursementId: string | null;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPaymentIntentDetail = AdminPaymentIntent & {
  histories: Array<{
    id: string;
    fromStatus: PaymentIntentStatus | null;
    toStatus: PaymentIntentStatus;
    reason: string | null;
    actorType: string | null;
    actorId: string | null;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    type: 'WEBHOOK' | 'VERIFY' | 'MANUAL' | 'SYSTEM';
    providerEventId: string | null;
    raw: unknown;
    receivedAt: string;
  }>;
};

export type AdminMandate = {
  id: string;
  borrowerId: string;
  loanId: string | null;
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'MONNIFY' | 'MANUAL';
  status: MandateStatus;
  maxAmount: string | null;
  nextDebitAt: string | null;
  frequency: string | null;
  lastDebit: {
    id: string;
    status: string;
    amount: string;
    scheduledAt: string;
    attemptedAt: string | null;
    succeededAt: string | null;
    failureReason: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminMandateDetail = AdminMandate & {
  authorizationCodePresent: boolean;
  customerCodePresent: boolean;
  debits: Array<{
    id: string;
    status: string;
    amount: string;
    currency: string;
    scheduledAt: string;
    attemptedAt: string | null;
    succeededAt: string | null;
    failureReason: string | null;
    attemptCount: number;
    maxAttempts: number;
  }>;
};

export type ReconciliationRunType = 'PAYMENT' | 'DISBURSEMENT' | 'SETTLEMENT';
export type ReconciliationRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ReconciliationIssueStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED';
export type ReconciliationIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReconciliationIssueCategory =
  | 'MISSING_LEDGER'
  | 'DUPLICATE_LEDGER'
  | 'AMOUNT_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'UNKNOWN_REFERENCE'
  | 'FEE_MISMATCH';

export type ReconciliationStatus = 'MATCHED' | 'MISMATCH' | 'SUSPENSE' | 'RESOLVED' | 'WRITE_OFF';
export type ReconciliationResolutionType =
  | 'MANUAL_ADJUSTMENT'
  | 'WRITE_OFF'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR'
  | 'DUPLICATE'
  | 'REFUND';
export type SettlementBatchStatus = 'OPEN' | 'CLOSED';

export type ReconciliationRun = {
  id: string;
  tenantId: string;
  type: ReconciliationRunType;
  status: ReconciliationRunStatus;
  startedAt: string;
  finishedAt: string | null;
  metadata?: unknown;
  createdAt: string;
};

export type ReconciliationIssue = {
  id: string;
  runId: string;
  tenantId: string;
  category: ReconciliationIssueCategory;
  severity: ReconciliationIssueSeverity;
  entityType: 'PAYMENT' | 'DISBURSEMENT';
  entityId: string;
  providerRef: string | null;
  expected?: unknown;
  actual?: unknown;
  status: ReconciliationIssueStatus;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReconciliationRecord = {
  id: string;
  tenantId: string;
  provider: string;
  referenceType: string;
  referenceId: string;
  providerRef: string | null;
  amountMinor: string;
  currency: string;
  status: ReconciliationStatus;
  mismatchReason: string | null;
  settlementBatchId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReconciliationRecordDetail = ReconciliationRecord & {
  resolutionType: ReconciliationResolutionType | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  settlementBatch?: {
    id: string;
    provider: string;
    settlementDate: string;
    status: SettlementBatchStatus;
  } | null;
  histories: Array<{
    id: string;
    fromStatus: ReconciliationStatus;
    toStatus: ReconciliationStatus;
    resolutionType: ReconciliationResolutionType | null;
    note: string | null;
    actedByAdminId: string | null;
    createdAt: string;
  }>;
};

export type SettlementBatch = {
  id: string;
  tenantId: string;
  provider: string;
  settlementDate: string;
  currency: string;
  totalAmount: string;
  status: SettlementBatchStatus;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SettlementBatchDetail = SettlementBatch & {
  summary: {
    matched: number;
    mismatch: number;
    suspense: number;
    resolved: number;
    writeOff: number;
  };
  records?: ReconciliationRecord[];
};

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type InterestType = 'FLAT' | 'REDUCING';
export type RepaymentFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type FeeType = 'FIXED' | 'PERCENT_OF_PRINCIPAL';
export type FeeApplyAt = 'UPFRONT' | 'PER_INSTALLMENT' | 'END';

export type LoanProductFee = {
  id: string;
  name: string;
  type: FeeType;
  amount: number;
  applyAt: FeeApplyAt;
  createdAt: string;
};

export type LoanProduct = {
  id: string;
  tenantId: string;
  name: string;
  status: ProductStatus;
  currency: string;
  minPrincipal: number;
  maxPrincipal: number;
  minTenorDays: number;
  maxTenorDays: number;
  interestType: InterestType;
  interestRateBps: number;
  repaymentFrequency: RepaymentFrequency;
  graceDays: number;
  allowEarlyRepayment: boolean;
  createdAt: string;
  updatedAt: string;
  fees: LoanProductFee[];
};

export type CreateLoanProductInput = Omit<LoanProduct, 'id' | 'tenantId' | 'status' | 'createdAt' | 'updatedAt' | 'fees'>;
export type UpdateLoanProductInput = Partial<CreateLoanProductInput>;
export type CreateLoanProductFeeInput = Omit<LoanProductFee, 'id' | 'createdAt'>;

export type ComputeOfferInput = {
  principalMinor: number;
  tenorDays: number;
  startDate?: string;
};

export type ComputeOfferResponse = {
  schedule: Array<{
    installmentNo: number;
    dueDate: string;
    principal: number;
    interest: number;
    fees: number;
    total: number;
  }>;
  totals: {
    principal: number;
    interest: number;
    fees: number;
    total: number;
  };
  effectiveAprBps: number;
  productSnapshot: unknown;
};

export function getApiBase(): string {
  const value = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim();
  if (!value) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  }
  return value.replace(/\/+$/, '');
}

export function decodeRoleFromAccessToken(token: string | null): AdminActorRole | null {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const payload = JSON.parse(atob(base64Url + padding)) as { role?: unknown };
    return typeof payload.role === 'string' ? (payload.role as AdminActorRole) : null;
  } catch {
    return null;
  }
}

export class ApiRequestError extends Error {
  readonly requestId: string;
  readonly status: number;
  readonly url: string;
  readonly code: string | null;
  readonly details: unknown;

  constructor(input: {
    message: string;
    requestId: string;
    status: number;
    url: string;
    code?: string | null;
    details?: unknown;
  }) {
    super(input.message);
    this.name = 'ApiRequestError';
    this.requestId = input.requestId;
    this.status = input.status;
    this.url = input.url;
    this.code = input.code ?? null;
    this.details = input.details ?? null;
  }
}

export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers ?? {});
  const requestId = createRequestId();

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('x-request-id', requestId);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;

  const execute = (requestHeaders: Headers) =>
    fetch(url, {
      ...init,
      headers: requestHeaders
    });

  let response = await execute(headers);

  if (response.ok) {
    if (response.status === 204) {
      return null as T;
    }
    return (await response.json()) as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; code?: string; requestId?: string; details?: unknown; error?: { code?: string; message?: string; details?: unknown } }
    | null;
  const errorCode = payload?.error?.code ?? payload?.code ?? null;
  const errorDetails = payload?.error?.details ?? payload?.details ?? null;

  if (
    response.status === 403 &&
    errorCode === 'CONFIRMATION_REQUIRED' &&
    !headers.has('x-admin-confirmation') &&
    (init?.method ?? 'GET').toUpperCase() !== 'GET'
  ) {
    const purpose =
      typeof (errorDetails as { purpose?: unknown } | null | undefined)?.purpose === 'string'
        ? ((errorDetails as { purpose: string }).purpose)
        : null;
    const resourceId =
      typeof (errorDetails as { resourceId?: unknown } | null | undefined)?.resourceId === 'string'
        ? ((errorDetails as { resourceId: string }).resourceId)
        : undefined;
    if (purpose) {
      toast.info('Confirming action...');
      const confirmHeaders = new Headers();
      confirmHeaders.set('Content-Type', 'application/json');
      confirmHeaders.set('x-request-id', createRequestId());
      if (token) {
        confirmHeaders.set('Authorization', `Bearer ${token}`);
      }
      const confirmResponse = await fetch(`${getApiBase()}/api/v1/admin/confirmations`, {
        method: 'POST',
        headers: confirmHeaders,
        body: JSON.stringify({ purpose, resourceId })
      });
      if (confirmResponse.ok) {
        const confirmation = (await confirmResponse.json().catch(() => null)) as { token?: string } | null;
        if (confirmation?.token) {
          headers.set('x-admin-confirmation', confirmation.token);
          toast.success('Confirmed ✅');
          response = await execute(headers);
          if (response.ok) {
            if (response.status === 204) {
              return null as T;
            }
            return (await response.json()) as T;
          }
        }
      }
    }
  }

  const payloadAfterRetry = (await response.json().catch(() => payload)) as
    | { message?: string; code?: string; requestId?: string; details?: unknown; error?: { code?: string; message?: string; details?: unknown } }
    | null;
  const responseRequestId = response.headers.get('x-request-id') ?? payloadAfterRetry?.requestId ?? requestId;
  const message =
    payloadAfterRetry?.message ?? payloadAfterRetry?.error?.message ?? `Request failed with status ${response.status}`;
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag('requestId', responseRequestId);
      scope.setTag('url', url);
      scope.setTag('status', String(response.status));
      Sentry.captureException(new Error(message));
    });
  }

  throw new ApiRequestError({
    message: `${message} (requestId: ${responseRequestId})`,
    requestId: responseRequestId,
    status: response.status,
    url,
    code: payloadAfterRetry?.error?.code ?? payloadAfterRetry?.code ?? null,
    details: payloadAfterRetry?.error?.details ?? payloadAfterRetry?.details ?? null
  });
}

export async function adminLogin(input: AdminLoginInput): Promise<AdminLoginResponse> {
  return request<AdminLoginResponse>('/api/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listAdminLoanApplications(
  input: ListAdminLoanApplicationsInput = {}
): Promise<AdminLoanApplication[]> {
  const query = new URLSearchParams();
  if (input.status) {
    query.set('status', input.status);
  }
  if (input.queue) {
    query.set('queue', input.queue);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request<{ items?: AdminLoanApplication[]; data?: AdminLoanApplication[] } | AdminLoanApplication[]>(
    `/api/v1/admin/loan-applications${suffix}`,
    { method: 'GET' }
  );

  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function listAdminAudit(limit = 100): Promise<AdminAuditItem[]> {
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  const payload = await request<{ items: AdminAuditItem[] }>(`/api/v1/admin/audit?${query.toString()}`, {
    method: 'GET'
  });
  return payload.items ?? [];
}

export async function listAuditTrail(input: {
  entityType?: string;
  entityId?: string;
  tenantId?: string;
  action?: string;
  limit?: number;
  cursor?: string;
} = {}): Promise<{ items: AuditTrailEvent[]; nextCursor: string | null }> {
  const query = new URLSearchParams();
  if (input.entityType) query.set('entityType', input.entityType);
  if (input.entityId) query.set('entityId', input.entityId);
  if (input.tenantId) query.set('tenantId', input.tenantId);
  if (input.action) query.set('action', input.action);
  if (input.limit != null) query.set('limit', String(input.limit));
  if (input.cursor) query.set('cursor', input.cursor);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ items: AuditTrailEvent[]; nextCursor: string | null }>(`/api/v1/admin/audit${suffix}`, {
    method: 'GET'
  });
}

export async function getAuditTrailEvent(id: string): Promise<{
  id: string;
  createdAt: string;
  requestId: string | null;
  actorType: string;
  actorId: string | null;
  actorRole: string | null;
  tenantId: string | null;
  lenderId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: unknown;
  afterJson: unknown;
  metadataJson: unknown;
  idempotencyKey: string | null;
}> {
  return request(`/api/v1/admin/audit/${id}`, { method: 'GET' });
}

export async function listAdminNotifications(input: {
  limit?: number;
  offset?: number;
  status?: NotificationRecordStatus;
} = {}): Promise<{ items: NotificationItem[]; total: number; limit: number; offset: number }> {
  const query = new URLSearchParams();
  if (input.limit != null) query.set('limit', String(input.limit));
  if (input.offset != null) query.set('offset', String(input.offset));
  if (input.status) query.set('status', input.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(`/api/v1/admin/notifications${suffix}`, { method: 'GET' });
}

export async function markAdminNotificationRead(
  notificationId: string
): Promise<{ id: string; status: NotificationRecordStatus }> {
  return request(`/api/v1/admin/notifications/${notificationId}/read`, { method: 'POST' });
}

export async function listAdminAudits(input: {
  from?: string;
  to?: string;
  actorType?: 'BORROWER' | 'TENANT_ADMIN' | 'SYSTEM';
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  status?: 'SUCCESS' | 'FAIL';
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: 'createdAt' | '-createdAt' | 'action' | '-action';
} = {}): Promise<{
  items: AdminAuditExplorerItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (input.from) query.set('from', input.from);
  if (input.to) query.set('to', input.to);
  if (input.actorType) query.set('actorType', input.actorType);
  if (input.actorId) query.set('actorId', input.actorId);
  if (input.action) query.set('action', input.action);
  if (input.entityType) query.set('entityType', input.entityType);
  if (input.entityId) query.set('entityId', input.entityId);
  if (input.status) query.set('status', input.status);
  if (input.q) query.set('q', input.q);
  query.set('page', String(input.page ?? 1));
  query.set('pageSize', String(input.pageSize ?? 25));
  query.set('sort', input.sort ?? '-createdAt');
  return request(`/api/v1/admin/audits?${query.toString()}`, { method: 'GET' });
}

export async function getAdminAudit(id: string): Promise<AdminAuditDetail> {
  return request<AdminAuditDetail>(`/api/v1/admin/audits/${id}`, { method: 'GET' });
}

export async function exportAdminAuditsCsv(input: {
  from?: string;
  to?: string;
  actorType?: 'BORROWER' | 'TENANT_ADMIN' | 'SYSTEM';
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  status?: 'SUCCESS' | 'FAIL';
  q?: string;
  sort?: 'createdAt' | '-createdAt' | 'action' | '-action';
} = {}): Promise<void> {
  const query = new URLSearchParams();
  if (input.from) query.set('from', input.from);
  if (input.to) query.set('to', input.to);
  if (input.actorType) query.set('actorType', input.actorType);
  if (input.actorId) query.set('actorId', input.actorId);
  if (input.action) query.set('action', input.action);
  if (input.entityType) query.set('entityType', input.entityType);
  if (input.entityId) query.set('entityId', input.entityId);
  if (input.status) query.set('status', input.status);
  if (input.q) query.set('q', input.q);
  query.set('sort', input.sort ?? '-createdAt');
  const url = `${getApiBase()}/api/v1/admin/audits/export.csv?${query.toString()}`;
  const token = getAccessToken();
  const requestId = createRequestId();
  const headers = new Headers();
  headers.set('x-request-id', requestId);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(url, {
    method: 'GET',
    headers
  });
  if (!response.ok) {
    const responseRequestId = response.headers.get('x-request-id') ?? requestId;
    // eslint-disable-next-line no-console
    console.error('API request failed', {
      requestId: responseRequestId,
      url,
      status: response.status,
      bodySnippet: 'audit export failed'
    });
    throw new ApiRequestError({
      message: `Export failed with status ${response.status} (requestId: ${responseRequestId})`,
      requestId: responseRequestId,
      status: response.status,
      url
    });
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `audit_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function listSuspiciousActivity(input: {
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolved?: boolean;
  limit?: number;
} = {}): Promise<SuspiciousActivityItem[]> {
  const query = new URLSearchParams();
  if (input.severity) query.set('severity', input.severity);
  if (input.resolved != null) query.set('resolved', input.resolved ? 'true' : 'false');
  if (input.limit != null) query.set('limit', String(input.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<SuspiciousActivityItem[]>(`/api/v1/admin/suspicious-activity${suffix}`, { method: 'GET' });
}

export async function listSuspiciousActivityPaged(input: {
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolved?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<SuspiciousActivityPage> {
  const query = new URLSearchParams();
  if (input.severity) query.set('severity', input.severity);
  if (input.resolved != null) query.set('resolved', input.resolved ? 'true' : 'false');
  query.set('page', String(input.page ?? 1));
  query.set('pageSize', String(input.pageSize ?? 25));
  return request<SuspiciousActivityPage>(`/api/v1/admin/suspicious-activity/paged?${query.toString()}`, {
    method: 'GET'
  });
}

export async function getLoanForensicReport(id: string): Promise<LoanForensicReport> {
  return request<LoanForensicReport>(`/api/v1/admin/loan-applications/${id}/forensic-report`, { method: 'GET' });
}

export async function exportRegulatoryReport(input: {
  kind: 'loan-book' | 'delinquency' | 'ledger';
  format?: 'csv' | 'json';
  from?: string;
  to?: string;
}): Promise<void> {
  const query = new URLSearchParams();
  query.set('format', input.format ?? 'csv');
  if (input.from) query.set('from', input.from);
  if (input.to) query.set('to', input.to);
  const url = `${getApiBase()}/api/v1/admin/reports/${input.kind}/export?${query.toString()}`;
  const token = getAccessToken();
  const requestId = createRequestId();
  const headers = new Headers();
  headers.set('x-request-id', requestId);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    method: 'GET',
    headers
  });
  if (!response.ok) {
    throw new ApiRequestError({
      message: `Export failed with status ${response.status}`,
      requestId: response.headers.get('x-request-id') ?? requestId,
      status: response.status,
      url
    });
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `${input.kind}_${new Date().toISOString().slice(0, 10)}.${input.format === 'json' ? 'json' : 'csv'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function getAdminMetrics(): Promise<AdminMetricsResponse> {
  return request<AdminMetricsResponse>('/api/v1/admin/metrics', { method: 'GET' });
}

export async function getAdminSystemStatus(): Promise<AdminSystemStatusResponse> {
  return request<AdminSystemStatusResponse>('/api/v1/admin/system-status', { method: 'GET' });
}

export async function getDashboardMetrics(): Promise<DashboardMetricsResponse> {
  try {
    return await request<DashboardMetricsResponse>('/api/v1/admin/dashboard/metrics', { method: 'GET' });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Unable to fetch dashboard metrics: ${error.message}`);
    }
    throw new Error('Unable to fetch dashboard metrics.');
  }
}

export async function getRecentActivity(limit = 5): Promise<DashboardActivityItem[]> {
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  try {
    return await request<DashboardActivityItem[]>(`/api/v1/admin/dashboard/recent-activity?${query.toString()}`, {
      method: 'GET'
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Unable to fetch recent activity: ${error.message}`);
    }
    throw new Error('Unable to fetch recent activity.');
  }
}

export async function getPortfolioKpis(): Promise<PortfolioKpisResponse> {
  try {
    return await request<PortfolioKpisResponse>('/api/v1/admin/portfolio/kpis', { method: 'GET' });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Unable to fetch portfolio KPIs: ${error.message}`);
    }
    throw new Error('Unable to fetch portfolio KPIs.');
  }
}

export async function getPortfolioTrends(days = 30): Promise<PortfolioTrendsResponse> {
  const query = new URLSearchParams();
  query.set('days', String(days));
  try {
    return await request<PortfolioTrendsResponse>(`/api/v1/admin/portfolio/trends?${query.toString()}`, {
      method: 'GET'
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Unable to fetch portfolio trends: ${error.message}`);
    }
    throw new Error('Unable to fetch portfolio trends.');
  }
}

export async function getPortfolioSummary(): Promise<PortfolioSummaryResponse> {
  return request<PortfolioSummaryResponse>('/api/v1/admin/portfolio/summary', { method: 'GET' });
}

export async function getPortfolioPar(): Promise<PortfolioParResponse> {
  return request<PortfolioParResponse>('/api/v1/admin/portfolio/par', { method: 'GET' });
}

export async function getPortfolioDelinquency(): Promise<PortfolioDelinquencyResponse> {
  return request<PortfolioDelinquencyResponse>('/api/v1/admin/portfolio/delinquency', { method: 'GET' });
}

export async function getPortfolioVintage(months = 6): Promise<PortfolioVintageResponse> {
  const query = new URLSearchParams();
  query.set('months', String(Math.min(Math.max(months, 1), 24)));
  return request<PortfolioVintageResponse>(`/api/v1/admin/portfolio/vintage?${query.toString()}`, {
    method: 'GET'
  });
}

export async function getPortfolioCollections(days = 30): Promise<PortfolioCollectionsResponse> {
  const query = new URLSearchParams();
  query.set('days', String(Math.min(Math.max(days, 1), 120)));
  return request<PortfolioCollectionsResponse>(`/api/v1/admin/portfolio/collections?${query.toString()}`, {
    method: 'GET'
  });
}

export async function getPortfolioTreasuryExposure(): Promise<PortfolioTreasuryExposureResponse> {
  return request<PortfolioTreasuryExposureResponse>('/api/v1/admin/portfolio/treasury', { method: 'GET' });
}

export async function listAdminJobs(input: {
  status?: AdminJobStatus;
  type?: AdminJobType;
  take?: number;
  cursor?: string;
} = {}): Promise<{ items: AdminJobItem[]; nextCursor: string | null }> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.type) query.set('type', input.type);
  if (input.take != null) query.set('take', String(input.take));
  if (input.cursor) query.set('cursor', input.cursor);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ items: AdminJobItem[]; nextCursor: string | null }>(`/api/v1/admin/jobs${suffix}`, { method: 'GET' });
}

export async function getAdminJob(id: string): Promise<AdminJobItem> {
  return request<AdminJobItem>(`/api/v1/admin/jobs/${id}`, { method: 'GET' });
}

export async function listOpsJobs(input: {
  queue?: string;
  status?: OpsJobStatus;
  limit?: number;
  search?: string;
} = {}): Promise<{ items: OpsJobItem[]; nextCursor?: string | null }> {
  const query = new URLSearchParams();
  if (input.queue) query.set('queue', input.queue);
  if (input.status) query.set('status', input.status);
  if (input.limit != null) query.set('limit', String(input.limit));
  if (input.search) query.set('search', input.search);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ items: OpsJobItem[]; nextCursor?: string | null }>(`/api/v1/admin/ops/jobs${suffix}`, { method: 'GET' });
}

export async function getOpsJob(input: { id: string; queue?: string }): Promise<OpsJobDetail> {
  const query = new URLSearchParams();
  if (input.queue) query.set('queue', input.queue);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<OpsJobDetail>(`/api/v1/admin/ops/jobs/${encodeURIComponent(input.id)}${suffix}`, { method: 'GET' });
}

export async function retryOpsJob(input: { id: string; queue?: string }): Promise<OpsJobItem> {
  const query = new URLSearchParams();
  if (input.queue) query.set('queue', input.queue);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<OpsJobItem>(`/api/v1/admin/ops/jobs/${encodeURIComponent(input.id)}/retry${suffix}`, {
    method: 'POST'
  });
}

export async function getAdminLoanApplication(id: string): Promise<AdminLoanApplication> {
  return request<AdminLoanApplication>(`/api/v1/admin/loan-applications/${id}`, { method: 'GET' });
}

export async function setAdminLoanApplicationStatus(
  id: string,
  input: SetLoanApplicationStatusInput
): Promise<AdminLoanApplication> {
  return request<AdminLoanApplication>(`/api/v1/admin/loan-applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function transitionLoanApplication(
  id: string,
  input: TransitionLoanApplicationInput
): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function resolveTenant(input: { slug: string; lenderTitle: string }) {
  const requestId = createRequestId();
  const url = `${getApiBase()}/api/v1/tenants/resolve?slug=${encodeURIComponent(input.slug)}&lenderTitle=${encodeURIComponent(input.lenderTitle)}`;
  const res = await fetch(url, {
    headers: {
      'x-request-id': requestId
    }
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { message?: string; error?: { message?: string }; requestId?: string }
      | null;
    const responseRequestId = res.headers.get('x-request-id') ?? payload?.requestId ?? requestId;
    const message =
      payload?.message ?? payload?.error?.message ?? `Tenant resolve failed with status ${res.status}`;
    // eslint-disable-next-line no-console
    console.error('API request failed', {
      requestId: responseRequestId,
      url,
      status: res.status,
      bodySnippet: typeof payload?.message === 'string' ? payload.message.slice(0, 200) : ''
    });
    throw new ApiRequestError({
      message: `${message} (requestId: ${responseRequestId})`,
      requestId: responseRequestId,
      status: res.status,
      url
    });
  }
  const payload = (await res.json()) as { tenantId?: string; id?: string; slug?: string; name?: string };
  return {
    tenantId: payload.tenantId ?? payload.id ?? '',
    id: payload.id,
    slug: payload.slug,
    name: payload.name
  };
}

export async function getLoanApplication(id: string): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}`, { method: 'GET' });
}

export async function getLoanApplicationRisk(id: string): Promise<LoanRiskView> {
  return request<LoanRiskView>(`/api/v1/admin/loan-applications/${id}/risk`, { method: 'GET' });
}

export async function addLoanApplicationHold(
  id: string,
  input: { type: RiskHoldType; note?: string }
): Promise<LoanRiskView> {
  return request<LoanRiskView>(`/api/v1/admin/loan-applications/${id}/holds`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function resolveLoanApplicationHold(
  holdId: string,
  input: { resolutionNote?: string } = {}
): Promise<LoanRiskView> {
  return request<LoanRiskView>(`/api/v1/admin/holds/${holdId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function overrideLoanApplicationRisk(
  id: string,
  input: { note: string }
): Promise<LoanRiskView> {
  return request<LoanRiskView>(`/api/v1/admin/loan-applications/${id}/risk/override`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function runLoanApplicationRiskEvaluation(
  id: string
): Promise<{ evaluationId: string; assessment: { score: number; decision: RiskDecision; reasons: unknown[] } }> {
  return request(`/api/v1/admin/loan-applications/${id}/risk-evaluate`, { method: 'POST' });
}

export async function listLoanApplicationRiskEvaluations(
  id: string
): Promise<{ items: RiskEvaluationItem[] }> {
  return request(`/api/v1/admin/loan-applications/${id}/risk-evaluations`, { method: 'GET' });
}

export async function decideLoanApplication(
  id: string
): Promise<{
  decision: 'APPROVE' | 'MANUAL_REVIEW' | 'DECLINE';
  transitionedTo: AdminLoanApplicationStatus;
  eventId: string;
  reasonCodes: string[];
}> {
  return request(`/api/v1/admin/loan-applications/${id}/decide`, { method: 'POST' });
}

export async function runLoanApplicationFraudCheck(
  id: string
): Promise<{
  blocked: boolean;
  signals: Array<{ type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>;
}> {
  return request(`/api/v1/admin/loan-applications/${id}/fraud-check`, { method: 'POST' });
}

export async function approveLoanIdentityManualReview(id: string): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/identity/approve`, {
    method: 'POST'
  });
}

export async function listFraudAlerts(input: {
  status?: FraudAlertStatus;
  severity?: FraudSeverity;
  onlyOpen?: boolean;
} = {}): Promise<FraudAlertListItem[]> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.severity) query.set('severity', input.severity);
  if (input.onlyOpen != null) query.set('onlyOpen', String(input.onlyOpen));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<FraudAlertListItem[]>(`/api/v1/admin/fraud/alerts${suffix}`, { method: 'GET' });
}

export async function getFraudAlert(id: string): Promise<FraudAlertDetail> {
  return request<FraudAlertDetail>(`/api/v1/admin/fraud/alerts/${id}`, { method: 'GET' });
}

export async function updateFraudAlert(
  id: string,
  input: { status: Exclude<FraudAlertStatus, 'OPEN'>; resolutionNotes?: string }
): Promise<{ id: string; status: FraudAlertStatus; resolutionNotes: string | null; resolvedAt: string | null }> {
  return request(`/api/v1/admin/fraud/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function createManualFraudFlag(
  loanApplicationId: string,
  input: { severity?: FraudSeverity; note?: string } = {}
): Promise<{ signalId: string; alertId: string | null }> {
  return request(`/api/v1/admin/fraud/loan-applications/${loanApplicationId}/manual-flag`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listFraudQueue(level?: 'HIGH' | 'SEVERE'): Promise<{ items: FraudQueueItem[] }> {
  const query = new URLSearchParams();
  if (level) query.set('level', level);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ items: FraudQueueItem[] }>(`/api/v1/admin/fraud/queue${suffix}`, {
    method: 'GET'
  });
}

export async function getFraudBorrower(borrowerId: string): Promise<FraudBorrowerDetail> {
  return request<FraudBorrowerDetail>(`/api/v1/admin/fraud/borrowers/${encodeURIComponent(borrowerId)}`, {
    method: 'GET'
  });
}

export async function holdFraudBorrower(
  borrowerId: string,
  input: { reason: string }
): Promise<{
  id: string;
  tenantId: string;
  borrowerId: string;
  status: 'ACTIVE' | 'RELEASED';
  reason: string;
  createdByAdminId: string | null;
  createdBySystem: boolean;
  createdAt: string;
  updatedAt: string;
}> {
  return request(`/api/v1/admin/fraud/borrowers/${encodeURIComponent(borrowerId)}/hold`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function releaseFraudBorrowerHold(
  borrowerId: string,
  input: { reason: string }
): Promise<{
  id: string;
  tenantId: string;
  borrowerId: string;
  status: 'ACTIVE' | 'RELEASED';
  reason: string;
  releasedAt: string | null;
  releaseReason: string | null;
  updatedAt: string;
}> {
  return request(`/api/v1/admin/fraud/borrowers/${encodeURIComponent(borrowerId)}/release`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listRiskPolicies(): Promise<RiskPolicy[]> {
  return request('/api/v1/admin/risk/policies', { method: 'GET' });
}

export async function createRiskPolicy(input: { name: string; configJson: unknown }): Promise<RiskPolicy> {
  return request('/api/v1/admin/risk/policies', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function activateRiskPolicy(id: string): Promise<{ ok: boolean }> {
  return request(`/api/v1/admin/risk/policies/${id}/activate`, { method: 'POST' });
}

export async function listTenantAdminUsers(input: {
  query?: string;
  role?: TenantAdminRole;
  isActive?: boolean;
} = {}): Promise<TenantAdminUserItem[]> {
  const query = new URLSearchParams();
  if (input.query) query.set('query', input.query);
  if (input.role) query.set('role', input.role);
  if (input.isActive !== undefined) query.set('isActive', String(input.isActive));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<TenantAdminUserItem[]>(`/api/v1/admin/tenant-admin-users${suffix}`, { method: 'GET' });
}

export async function createTenantAdminUser(input: {
  email: string;
  role: TenantAdminRole;
  password?: string;
}): Promise<{ user: TenantAdminUserItem; temporaryPassword: string | null }> {
  return request<{ user: TenantAdminUserItem; temporaryPassword: string | null }>(`/api/v1/admin/tenant-admin-users`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateTenantAdminUser(
  id: string,
  input: { role?: TenantAdminRole; isActive?: boolean }
): Promise<TenantAdminUserItem> {
  return request<TenantAdminUserItem>(`/api/v1/admin/tenant-admin-users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function resetTenantAdminUserPassword(
  id: string
): Promise<{ user: TenantAdminUserItem; temporaryPassword: string }> {
  return request<{ user: TenantAdminUserItem; temporaryPassword: string }>(
    `/api/v1/admin/tenant-admin-users/${id}/reset-password`,
    {
      method: 'POST'
    }
  );
}

export async function approveLoanApplication(id: string): Promise<AdminLoanApplicationDetail> {
  return transitionLoanApplication(id, { toStatus: 'APPROVED' });
}

export async function rejectLoanApplication(id: string, reason?: string): Promise<AdminLoanApplicationDetail> {
  return transitionLoanApplication(id, {
    toStatus: 'REJECTED',
    note: reason?.trim() || undefined
  });
}

export async function disburseLoanApplication(
  id: string,
  input: DisburseLoanInput
): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/disburse`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function markReadyForDisbursement(id: string): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/ready-for-disbursement`, {
    method: 'POST'
  });
}

export async function repayLoanApplication(
  id: string,
  input: RepayLoanInput
): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/repay`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function accrueInterest(
  id: string,
  input: AccrueInterestInput
): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/accrue-interest`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function pauseInterest(
  id: string,
  input: PauseInterestInput
): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/pause-interest`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function resumeInterest(id: string): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/resume-interest`, {
    method: 'POST'
  });
}

export async function setInterestOverride(
  id: string,
  input: SetInterestOverrideInput
): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/set-interest-override`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function removeInterestOverride(
  id: string,
  input: RemoveInterestOverrideInput = {}
): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/remove-interest-override`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listInterestAudit(id: string): Promise<
  Array<{
    id: string;
    action: 'PAUSED' | 'RESUMED' | 'RATE_OVERRIDE_SET' | 'RATE_OVERRIDE_REMOVED';
    previousRate: string | null;
    newRate: string | null;
    reason: string | null;
    performedById: string;
    createdAt: string;
  }>
> {
  return request(`/api/v1/admin/loan-applications/${id}/interest-audit`, { method: 'GET' });
}

export async function generateLoanSchedule(
  id: string,
  input: GenerateScheduleInput
): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/generate-schedule`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listLoanSchedule(id: string): Promise<LoanScheduleItem[]> {
  return request<LoanScheduleItem[]>(`/api/v1/admin/loan-applications/${id}/schedule`, {
    method: 'GET'
  });
}

export async function postLoanRepayment(
  id: string,
  input: RepayLoanInput
): Promise<{
  repayment: { amount: string; postedAt: string; channel: string; reference: string | null };
  outstanding: { principal: string; interest: string; fees: string; total: string; nextDueDate: string | null };
  schedule: LoanScheduleItem[];
}> {
  return request(`/api/v1/admin/loan-applications/${id}/repayments`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listLoanRepayments(id: string): Promise<LoanRepaymentRow[]> {
  return request<LoanRepaymentRow[]>(`/api/v1/admin/loan-applications/${id}/repayments`, {
    method: 'GET'
  });
}

export async function recalcLoanDelinquency(id: string): Promise<AdminLoanApplicationDetail> {
  return request<AdminLoanApplicationDetail>(`/api/v1/admin/loan-applications/${id}/recalc-delinquency`, {
    method: 'POST'
  });
}

export async function listCollectionsQueue(bucket?: CollectionBucket): Promise<CollectionQueueItem[]> {
  const query = new URLSearchParams();
  if (bucket) query.set('bucket', bucket);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request<{ items: CollectionQueueItem[] }>(`/api/v1/admin/collections/queue${suffix}`, {
    method: 'GET'
  });
  return payload.items ?? [];
}

export async function addCollectionActivity(
  loanId: string,
  input: { actionType: 'CALL' | 'SMS' | 'EMAIL' | 'VISIT' | 'NOTE'; note?: string }
): Promise<{ id: string; actionType: string; note: string | null; performedBy: string; createdAt: string }> {
  return request(`/api/v1/admin/collections/${loanId}/activity`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function writeOffLoan(loanId: string): Promise<{ ok: boolean }> {
  return request(`/api/v1/admin/collections/${loanId}/write-off`, { method: 'POST' });
}

export async function settleLoan(loanId: string): Promise<{ ok: boolean }> {
  return request(`/api/v1/admin/collections/${loanId}/settle`, { method: 'POST' });
}

export async function runCollectionsScan(input: { now?: string } = {}): Promise<{ scanned: number; opened: number; resolved: number }> {
  return request('/api/v1/admin/collections/run', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listCollectionsCases(input: {
  status?: CollectionsCaseStatus;
  stage?: CollectionsStage;
  assignedTo?: string;
  limit?: number;
} = {}): Promise<CollectionsCaseListItem[]> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.stage) query.set('stage', input.stage);
  if (input.assignedTo) query.set('assignedTo', input.assignedTo);
  if (input.limit) query.set('limit', String(input.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request<{ items: CollectionsCaseListItem[] }>(`/api/v1/admin/collections/cases${suffix}`, {
    method: 'GET'
  });
  return payload.items ?? [];
}

export async function getCollectionsCase(id: string): Promise<CollectionsCaseDetail> {
  return request<CollectionsCaseDetail>(`/api/v1/admin/collections/cases/${id}`, { method: 'GET' });
}

export async function assignCollectionsCase(id: string, adminUserId: string) {
  return request(`/api/v1/admin/collections/cases/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ adminUserId })
  });
}

export async function addCollectionsCaseAction(
  id: string,
  input: { type: CollectionsCaseActionType; note: string; metadata?: Record<string, unknown> }
) {
  return request(`/api/v1/admin/collections/cases/${id}/action`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function setCollectionsPromiseToPay(
  id: string,
  input: { promiseToPayAt: string; note?: string }
) {
  return request(`/api/v1/admin/collections/cases/${id}/promise-to-pay`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function closeCollectionsCase(
  id: string,
  input: { resolutionNote: string }
) {
  return request(`/api/v1/admin/collections/cases/${id}/close`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function writeOffCollectionsCase(
  id: string,
  input: { note: string }
) {
  return request(`/api/v1/admin/collections/cases/${id}/write-off`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function createCase(input: {
  borrowerId?: string;
  loanApplicationId?: string;
  repaymentId?: string;
  disbursementId?: string;
  type: CaseType;
  priority: CasePriority;
  subject: string;
  description: string;
  assignedToAdminUserId?: string;
}): Promise<CaseListItem> {
  return request('/api/v1/admin/cases', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listCases(input: {
  status?: CaseStatus;
  priority?: CasePriority;
  assignedToAdminUserId?: string;
  borrowerId?: string;
  loanApplicationId?: string;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  items: CaseListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.priority) query.set('priority', input.priority);
  if (input.assignedToAdminUserId) query.set('assignedToAdminUserId', input.assignedToAdminUserId);
  if (input.borrowerId) query.set('borrowerId', input.borrowerId);
  if (input.loanApplicationId) query.set('loanApplicationId', input.loanApplicationId);
  if (input.overdueOnly != null) query.set('overdueOnly', String(input.overdueOnly));
  if (input.page != null) query.set('page', String(input.page));
  if (input.pageSize != null) query.set('pageSize', String(input.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(`/api/v1/admin/cases${suffix}`, { method: 'GET' });
}

export async function getCase(id: string): Promise<CaseDetail> {
  return request(`/api/v1/admin/cases/${id}`, { method: 'GET' });
}

export async function addCaseMessage(
  id: string,
  input: { visibility: 'INTERNAL' | 'BORROWER'; message: string }
): Promise<CaseDetail['messages'][number]> {
  return request(`/api/v1/admin/cases/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function assignCase(id: string, input: { adminUserId?: string } = {}): Promise<CaseListItem> {
  return request(`/api/v1/admin/cases/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function transitionCase(
  id: string,
  input: {
    toStatus: CaseStatus;
    reason?: string;
    resolutionCode?: CaseResolutionCode;
    resolutionNotes?: string;
  }
): Promise<CaseListItem> {
  return request(`/api/v1/admin/cases/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function createSupportCase(input: {
  title: string;
  loanId?: string;
  borrowerId?: string;
}): Promise<SupportCase> {
  return request('/api/v1/admin/support/cases', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listSupportCases(input: {
  status?: SupportCaseStatus;
  loanId?: string;
  borrowerId?: string;
} = {}): Promise<SupportCase[]> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.loanId) query.set('loanId', input.loanId);
  if (input.borrowerId) query.set('borrowerId', input.borrowerId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(`/api/v1/admin/support/cases${suffix}`, { method: 'GET' });
}

export async function getSupportCase(id: string): Promise<SupportCaseDetail> {
  return request(`/api/v1/admin/support/cases/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function addSupportNote(
  id: string,
  input: { body: string; evidenceUrl?: string }
): Promise<SupportNote> {
  return request(`/api/v1/admin/support/cases/${encodeURIComponent(id)}/notes`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function createSupportAction(
  id: string,
  input: { type: SupportActionType; reason: string; payload?: Record<string, unknown> }
): Promise<SupportAction> {
  return request(`/api/v1/admin/support/cases/${encodeURIComponent(id)}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      type: input.type,
      reason: input.reason,
      payload: input.payload ?? {}
    })
  });
}

export async function approveSupportAction(
  actionId: string,
  input: { decisionNote?: string } = {}
): Promise<SupportAction> {
  return request(`/api/v1/admin/support/actions/${encodeURIComponent(actionId)}/approve`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function rejectSupportAction(
  actionId: string,
  input: { decisionNote: string }
): Promise<SupportAction> {
  return request(`/api/v1/admin/support/actions/${encodeURIComponent(actionId)}/reject`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function executeSupportAction(actionId: string): Promise<SupportAction> {
  return request(`/api/v1/admin/support/actions/${encodeURIComponent(actionId)}/execute`, {
    method: 'POST'
  });
}

export async function closeSupportCase(id: string): Promise<SupportCase> {
  return request(`/api/v1/admin/support/cases/${encodeURIComponent(id)}/close`, {
    method: 'POST'
  });
}

export async function pauseLoanPenalty(
  loanAccountId: string,
  input: { isPaused: boolean; note: string }
) {
  return request(`/api/v1/admin/loans/${loanAccountId}/penalty/pause`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function waiveLoanPenalty(
  loanAccountId: string,
  input: { amount: number; note: string }
) {
  return request(`/api/v1/admin/loans/${loanAccountId}/penalty/waive`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export type DisbursementListRow = {
  id: string;
  loanApplicationId: string;
  amount: string;
  currency: string;
  method: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  provider: string | null;
  providerReference: string | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BorrowerPayoutProfile = {
  id: string;
  tenantId: string;
  borrowerId: string;
  provider: 'PAYSTACK';
  recipientCode: string;
  bankCode: string;
  accountNumber: string;
  accountName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayoutIntentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

export type PayoutIntentRow = {
  id: string;
  tenantId: string;
  borrowerId: string;
  loanId: string;
  amountMinor: number;
  currency: string;
  status: PayoutIntentStatus;
  provider: 'PAYSTACK';
  providerTransferCode: string | null;
  providerReference: string | null;
  recipientCode: string;
  createdAt: string;
  updatedAt: string;
};

export type LedgerAccountRow = {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'INCOME' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
  currency: string;
  debitMinor: string;
  creditMinor: string;
  balanceMinor: string;
};

export type LedgerEntryRow = {
  id: string;
  occurredAt: string;
  type: 'DISBURSEMENT' | 'REPAYMENT' | 'ACCRUAL' | 'WRITE_OFF' | 'ADJUSTMENT';
  referenceType: string;
  referenceId: string;
  memo: string | null;
  createdBy: string | null;
  lines: Array<{
    accountCode: string;
    direction: 'DEBIT' | 'CREDIT';
    amountMinor: string;
    currency: string;
  }>;
};

export type PortfolioSummaryReport = {
  totalLoans: number;
  activeLoans: number;
  delinquentLoans: number;
  totalOutstandingPrincipalMinor: string;
  totalOutstandingInterestMinor: string;
  totalOutstandingFeesMinor: string;
  totalOutstandingPenaltyMinor: string;
};

export type AgingReport = {
  asOf: string;
  buckets: Array<{
    bucket: '0' | '1-7' | '8-30' | '31-60' | '61-90' | '90+';
    amountMinor: string;
  }>;
};

export type RevenueReport = {
  interestIncomeMinor: string;
  feeIncomeMinor: string;
  penaltyIncomeMinor: string;
  waiversMinor: string;
  writeOffsMinor: string;
};

export type LoanLedgerReport = {
  loan: {
    id: string;
    fullName: string;
    status: AdminLoanApplicationStatus;
  };
  total: number;
  items: Array<
    LedgerEntryRow & {
      runningBalances: {
        principalMinor: string;
        interestMinor: string;
        feesMinor: string;
        penaltyMinor: string;
        cashMinor: string;
      };
    }
  >;
};

export type ReconcileReport = {
  scanned: number;
  mismatchesFound: number;
  mismatches: Array<{
    loanId: string;
    status: AdminLoanApplicationStatus;
    table: { principal: string; interest: string; fees: string; total: string };
    ledger: { principal: string; interest: string; fees: string; total: string };
  }>;
};

export async function listDisbursements(input: {
  status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  limit?: number;
  cursor?: string;
} = {}): Promise<DisbursementListRow[]> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.limit) query.set('limit', String(input.limit));
  if (input.cursor) query.set('cursor', input.cursor);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<DisbursementListRow[]>(`/api/v1/admin/disbursements${suffix}`, { method: 'GET' });
}

export async function listTreasuryPools(): Promise<TreasuryPool[]> {
  return request<TreasuryPool[]>('/api/v1/admin/treasury/pools', { method: 'GET' });
}

export async function createTreasuryPool(input: {
  name: string;
  type: CapitalPoolType;
  currency?: string;
  externalRef?: string | null;
  rules?: Record<string, unknown>;
}): Promise<TreasuryPool> {
  return request<TreasuryPool>('/api/v1/admin/treasury/pools', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function getTreasuryPool(id: string): Promise<TreasuryPool> {
  return request<TreasuryPool>(`/api/v1/admin/treasury/pools/${id}`, { method: 'GET' });
}

export async function getTreasuryPoolSummary(id: string): Promise<TreasuryPoolSummary> {
  return request<TreasuryPoolSummary>(`/api/v1/admin/treasury/pools/${id}/summary`, { method: 'GET' });
}

export async function getTreasuryPoolPerformance(
  id: string,
  input: { from?: string; to?: string } = {}
): Promise<TreasuryPoolPerformance> {
  const query = new URLSearchParams();
  if (input.from) query.set('from', input.from);
  if (input.to) query.set('to', input.to);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<TreasuryPoolPerformance>(`/api/v1/admin/treasury/pools/${id}/performance${suffix}`, {
    method: 'GET'
  });
}

export async function updateTreasuryPool(
  id: string,
  patch: {
    name?: string;
    status?: CapitalPoolStatus;
    externalRef?: string | null;
    rules?: Record<string, unknown>;
  }
): Promise<TreasuryPool> {
  return request<TreasuryPool>(`/api/v1/admin/treasury/pools/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
}

export async function listTreasuryPoolAllocations(id: string, take = 20): Promise<TreasuryAllocation[]> {
  const query = new URLSearchParams();
  query.set('take', String(take));
  return request<TreasuryAllocation[]>(`/api/v1/admin/treasury/pools/${id}/allocations?${query.toString()}`, {
    method: 'GET'
  });
}

export async function listLedgerAccounts(asOf?: string): Promise<LedgerAccountRow[]> {
  const query = new URLSearchParams();
  if (asOf) query.set('asOf', asOf);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<LedgerAccountRow[]>(`/api/v1/admin/ledger/accounts${suffix}`, { method: 'GET' });
}

export async function getLedgerAccountBalance(code: string, asOf?: string): Promise<LedgerAccountRow> {
  const query = new URLSearchParams();
  if (asOf) query.set('asOf', asOf);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<LedgerAccountRow>(`/api/v1/admin/ledger/accounts/${encodeURIComponent(code)}/balance${suffix}`, {
    method: 'GET'
  });
}

export async function getLedgerTrialBalance(asOf?: string): Promise<{ asOf: string | null; items: LedgerAccountRow[] }> {
  const query = new URLSearchParams();
  if (asOf) query.set('asOf', asOf);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ asOf: string | null; items: LedgerAccountRow[] }>(`/api/v1/admin/ledger/trial-balance${suffix}`, {
    method: 'GET'
  });
}

export async function listLedgerEntries(input: {
  from?: string;
  to?: string;
  referenceType?: string;
  referenceId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ total: number; items: LedgerEntryRow[] }> {
  const query = new URLSearchParams();
  if (input.from) query.set('from', input.from);
  if (input.to) query.set('to', input.to);
  if (input.referenceType) query.set('referenceType', input.referenceType);
  if (input.referenceId) query.set('referenceId', input.referenceId);
  if (input.limit != null) query.set('limit', String(input.limit));
  if (input.offset != null) query.set('offset', String(input.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ total: number; items: LedgerEntryRow[] }>(`/api/v1/admin/ledger/entries${suffix}`, {
    method: 'GET'
  });
}

export async function reverseLedgerEntry(id: string, reason: string): Promise<{ entryId: string; reused: boolean }> {
  return request<{ entryId: string; reused: boolean }>(`/api/v1/admin/ledger/entries/${id}/reverse`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  });
}

export async function getPortfolioSummaryReport(): Promise<PortfolioSummaryReport> {
  return request<PortfolioSummaryReport>('/api/v1/admin/reports/portfolio-summary', { method: 'GET' });
}

export async function getAgingReport(): Promise<AgingReport> {
  return request<AgingReport>('/api/v1/admin/reports/aging', { method: 'GET' });
}

export async function getLoanLedgerReport(loanId: string): Promise<LoanLedgerReport> {
  return request<LoanLedgerReport>(`/api/v1/admin/reports/loan/${loanId}/ledger`, { method: 'GET' });
}

export async function getRevenueReport(input: { from?: string; to?: string } = {}): Promise<RevenueReport> {
  const query = new URLSearchParams();
  if (input.from) query.set('from', input.from);
  if (input.to) query.set('to', input.to);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<RevenueReport>(`/api/v1/admin/reports/revenue${suffix}`, { method: 'GET' });
}

export async function getReconcileReport(): Promise<ReconcileReport> {
  return request<ReconcileReport>('/api/v1/admin/reports/reconcile', { method: 'GET' });
}

export async function getDisbursement(id: string): Promise<
  DisbursementListRow & {
    tenantId: string;
    idempotencyKey: string;
    initiatedByAdminId: string | null;
    initiatedBySystem: boolean;
    history: Array<{
      id: string;
      fromStatus: string | null;
      toStatus: string;
      note: string | null;
      actorType: string;
      actorId: string | null;
      createdAt: string;
    }>;
  }
> {
  return request(`/api/v1/admin/disbursements/${id}`, { method: 'GET' });
}

export async function retryDisbursement(id: string, input: { note?: string; forceFail?: boolean } = {}) {
  return request(`/api/v1/admin/disbursements/${id}/retry`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function reverseDisbursement(id: string, input: { reason: string }) {
  return request(`/api/v1/admin/disbursements/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function createDisbursementRecipient(input: {
  borrowerId: string;
  bankCode: string;
  accountNumber: string;
  accountName?: string;
}): Promise<BorrowerPayoutProfile> {
  return request<BorrowerPayoutProfile>(`/api/v1/admin/disbursements/recipient`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function initiateDisbursementTransfer(input: {
  loanId: string;
  amount?: number;
}): Promise<PayoutIntentRow> {
  return request<PayoutIntentRow>(`/api/v1/admin/disbursements/initiate`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function verifyDisbursementTransfer(reference: string): Promise<PayoutIntentRow> {
  return request<PayoutIntentRow>(`/api/v1/admin/disbursements/verify`, {
    method: 'POST',
    body: JSON.stringify({ reference })
  });
}

export async function listAdminPayments(input: {
  direction?: PaymentDirection;
  status?: PaymentIntentStatus;
  loanId?: string;
  borrowerId?: string;
  limit?: number;
  cursor?: string;
} = {}): Promise<AdminPaymentIntent[]> {
  const query = new URLSearchParams();
  if (input.direction) query.set('direction', input.direction);
  if (input.status) query.set('status', input.status);
  if (input.loanId) query.set('loanId', input.loanId);
  if (input.borrowerId) query.set('borrowerId', input.borrowerId);
  if (input.limit) query.set('limit', String(input.limit));
  if (input.cursor) query.set('cursor', input.cursor);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<AdminPaymentIntent[]>(`/api/v1/admin/payments${suffix}`, { method: 'GET' });
}

export async function getAdminPayment(id: string): Promise<AdminPaymentIntentDetail> {
  return request<AdminPaymentIntentDetail>(`/api/v1/admin/payments/${id}`, { method: 'GET' });
}

export async function verifyAdminPayment(id: string): Promise<AdminPaymentIntent> {
  return request<AdminPaymentIntent>(`/api/v1/admin/payments/${id}/verify`, { method: 'POST' });
}

export async function listAdminMandates(input: {
  status?: MandateStatus;
  borrowerId?: string;
  loanId?: string;
  limit?: number;
  cursor?: string;
} = {}): Promise<AdminMandate[]> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.borrowerId) query.set('borrowerId', input.borrowerId);
  if (input.loanId) query.set('loanId', input.loanId);
  if (input.limit) query.set('limit', String(input.limit));
  if (input.cursor) query.set('cursor', input.cursor);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<AdminMandate[]>(`/api/v1/admin/mandates${suffix}`, { method: 'GET' });
}

export async function getAdminMandate(id: string): Promise<AdminMandateDetail> {
  return request<AdminMandateDetail>(`/api/v1/admin/mandates/${id}`, { method: 'GET' });
}

export async function pauseAdminMandate(id: string, reason?: string): Promise<AdminMandate> {
  return request<AdminMandate>(`/api/v1/admin/mandates/${id}/pause`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function resumeAdminMandate(id: string, reason?: string): Promise<AdminMandate> {
  return request<AdminMandate>(`/api/v1/admin/mandates/${id}/resume`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function cancelAdminMandate(id: string, reason?: string): Promise<AdminMandate> {
  return request<AdminMandate>(`/api/v1/admin/mandates/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function initInboundAdminPayment(input: {
  borrowerId?: string;
  loanId?: string;
  amountMinor: number;
  currency?: string;
  idempotencyKey: string;
}): Promise<AdminPaymentIntent & { authorizationUrl?: string; reference?: string }> {
  return request(`/api/v1/admin/payments/inbound/init`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function initOutboundAdminPayment(input: {
  disbursementId: string;
  amountMinor: number;
  currency?: string;
  idempotencyKey: string;
  recipientCode: string;
  reason?: string;
}): Promise<AdminPaymentIntent> {
  return request(`/api/v1/admin/payments/outbound/init`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function runReconciliation(input: {
  type: ReconciliationRunType;
  days?: number;
  from?: string;
  to?: string;
}): Promise<{ runId: string; scanned: number; issuesCreated: number; issuesResolved: number; totals?: unknown }> {
  return request('/api/v1/admin/reconciliation/runs', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function runReconciliationNow(): Promise<{
  repayment: { runId: string; scanned: number; issuesCreated: number; issuesResolved: number; totals?: unknown };
  disbursement: { runId: string; scanned: number; issuesCreated: number; issuesResolved: number; totals?: unknown };
}> {
  return request('/api/v1/admin/reconciliation/run-now', {
    method: 'POST'
  });
}

export async function listReconciliationRuns(input: {
  type?: ReconciliationRunType;
  status?: ReconciliationRunStatus;
  limit?: number;
} = {}): Promise<ReconciliationRun[]> {
  const query = new URLSearchParams();
  if (input.type) query.set('type', input.type);
  if (input.status) query.set('status', input.status);
  if (input.limit) query.set('limit', String(input.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<ReconciliationRun[]>(`/api/v1/admin/reconciliation/runs${suffix}`, { method: 'GET' });
}

export async function getReconciliationRun(id: string): Promise<ReconciliationRun & { issues: ReconciliationIssue[] }> {
  return request(`/api/v1/admin/reconciliation/runs/${id}`, { method: 'GET' });
}

export async function listReconciliationIssues(input: {
  status?: ReconciliationIssueStatus;
  severity?: ReconciliationIssueSeverity;
  category?: ReconciliationIssueCategory;
  limit?: number;
} = {}): Promise<ReconciliationIssue[]> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.severity) query.set('severity', input.severity);
  if (input.category) query.set('category', input.category);
  if (input.limit) query.set('limit', String(input.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<ReconciliationIssue[]>(`/api/v1/admin/reconciliation/issues${suffix}`, { method: 'GET' });
}

export async function updateReconciliationIssue(
  id: string,
  input: { status: 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED'; note?: string }
): Promise<ReconciliationIssue> {
  return request(`/api/v1/admin/reconciliation/issues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function resolveReconciliationMismatch(id: string, resolutionNote?: string): Promise<ReconciliationIssue> {
  return request(`/api/v1/admin/reconciliation/mismatch/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolutionNote })
  });
}

export async function listReconciliationRecords(input: {
  status?: ReconciliationStatus;
  batchId?: string;
  provider?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
} = {}): Promise<ReconciliationRecord[]> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.batchId) query.set('batchId', input.batchId);
  if (input.provider) query.set('provider', input.provider);
  if (input.dateFrom) query.set('dateFrom', input.dateFrom);
  if (input.dateTo) query.set('dateTo', input.dateTo);
  if (input.limit != null) query.set('limit', String(input.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<ReconciliationRecord[]>(`/api/v1/admin/reconciliation${suffix}`, { method: 'GET' });
}

export async function getReconciliationRecord(id: string): Promise<ReconciliationRecordDetail> {
  return request<ReconciliationRecordDetail>(`/api/v1/admin/reconciliation/${id}`, { method: 'GET' });
}

export async function resolveReconciliationRecord(
  id: string,
  input: {
    resolutionType: ReconciliationResolutionType;
    note?: string;
    adjustment?: {
      lines: Array<{
        accountCode: string;
        direction: 'DEBIT' | 'CREDIT';
        amount: number;
      }>;
    };
  }
): Promise<ReconciliationRecordDetail> {
  return request<ReconciliationRecordDetail>(`/api/v1/admin/reconciliation/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function runReconciliationJob(input: {
  provider: string;
  dateFrom: string;
  dateTo: string;
}) {
  return request(`/api/v1/admin/reconciliation/jobs/run`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listReconciliationJobRuns(limit?: number) {
  const query = new URLSearchParams();
  if (limit != null) query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(`/api/v1/admin/reconciliation/jobs${suffix}`, { method: 'GET' });
}

export async function getReconciliationJobRun(id: string) {
  return request(`/api/v1/admin/reconciliation/jobs/${id}`, { method: 'GET' });
}

export async function createSettlementBatch(input: {
  provider: string;
  settlementDate: string;
  currency: string;
}): Promise<SettlementBatch> {
  return request<SettlementBatch>(`/api/v1/admin/reconciliation/settlement-batches`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listSettlementBatches(input: {
  status?: SettlementBatchStatus;
  limit?: number;
} = {}): Promise<SettlementBatch[]> {
  const query = new URLSearchParams();
  if (input.status) query.set('status', input.status);
  if (input.limit != null) query.set('limit', String(input.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<SettlementBatch[]>(`/api/v1/admin/reconciliation/settlement-batches${suffix}`, { method: 'GET' });
}

export async function getSettlementBatch(id: string): Promise<SettlementBatchDetail> {
  return request<SettlementBatchDetail>(`/api/v1/admin/reconciliation/settlement-batches/${id}`, { method: 'GET' });
}

export async function closeSettlementBatch(id: string) {
  return request(`/api/v1/admin/reconciliation/settlement-batches/${id}/close`, { method: 'POST' });
}

export async function listLoanProducts(status?: ProductStatus): Promise<LoanProduct[]> {
  const query = new URLSearchParams();
  if (status) {
    query.set('status', status);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await request<{ items?: LoanProduct[] } | LoanProduct[]>(`/api/v1/loan-products${suffix}`, {
    method: 'GET'
  });
  if (Array.isArray(payload)) return payload;
  return payload.items ?? [];
}

export async function getLoanProduct(id: string): Promise<LoanProduct> {
  return request<LoanProduct>(`/api/v1/loan-products/${id}`, { method: 'GET' });
}

export async function createLoanProduct(input: CreateLoanProductInput): Promise<LoanProduct> {
  return request<LoanProduct>('/api/v1/loan-products', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateLoanProduct(id: string, input: UpdateLoanProductInput): Promise<LoanProduct> {
  return request<LoanProduct>(`/api/v1/loan-products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function activateLoanProduct(id: string): Promise<LoanProduct> {
  return request<LoanProduct>(`/api/v1/loan-products/${id}/activate`, { method: 'POST' });
}

export async function deactivateLoanProduct(id: string): Promise<LoanProduct> {
  return request<LoanProduct>(`/api/v1/loan-products/${id}/deactivate`, { method: 'POST' });
}

export async function archiveLoanProduct(id: string): Promise<LoanProduct> {
  return request<LoanProduct>(`/api/v1/loan-products/${id}/archive`, { method: 'POST' });
}

export async function addLoanProductFee(id: string, input: CreateLoanProductFeeInput): Promise<LoanProduct> {
  return request<LoanProduct>(`/api/v1/loan-products/${id}/fees`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function removeLoanProductFee(id: string, feeId: string): Promise<LoanProduct> {
  return request<LoanProduct>(`/api/v1/loan-products/${id}/fees/${feeId}`, {
    method: 'DELETE'
  });
}

export async function computeOffer(id: string, input: ComputeOfferInput): Promise<ComputeOfferResponse> {
  return request<ComputeOfferResponse>(`/api/v1/loan-products/${id}/compute-offer`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}
