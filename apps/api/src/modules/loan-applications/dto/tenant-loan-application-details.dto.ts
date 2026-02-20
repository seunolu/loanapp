import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TenantLoanApplicationStatusHistoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  loanApplicationId!: string;

  @ApiProperty({
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF', 'SETTLED', 'REPAID', 'DEFAULTED', 'REJECTED'],
    nullable: true
  })
  fromStatus!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'OVERDUE' | 'WRITTEN_OFF' | 'SETTLED' | 'REPAID' | 'DEFAULTED' | 'REJECTED' | null;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF', 'SETTLED', 'REPAID', 'DEFAULTED', 'REJECTED'] })
  toStatus!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'OVERDUE' | 'WRITTEN_OFF' | 'SETTLED' | 'REPAID' | 'DEFAULTED' | 'REJECTED';

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ nullable: true })
  changedByUserId?: string | null;

  @ApiProperty()
  changedAt!: string;
}

class TenantDisbursementDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  method!: string;

  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED'] })
  status!: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

  @ApiPropertyOptional({ nullable: true })
  provider?: string | null;

  @ApiPropertyOptional({ nullable: true })
  providerReference?: string | null;

  @ApiPropertyOptional({ nullable: true })
  reference?: string | null;

  @ApiPropertyOptional({ nullable: true })
  disbursedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  processedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  failureReason?: string | null;

  @ApiProperty()
  idempotencyKey!: string;
}

class TenantRepaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  method!: string;

  @ApiPropertyOptional({ nullable: true })
  reference?: string | null;

  @ApiProperty()
  paidAt!: string;
}

class TenantRepaymentScheduleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  installmentNo!: number;

  @ApiProperty()
  dueDate!: string;

  @ApiProperty()
  principalDue!: string;

  @ApiProperty()
  interestDue!: string;

  @ApiProperty()
  feesDue!: string;

  @ApiProperty()
  totalDue!: string;

  @ApiProperty({ enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'] })
  status!: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

  @ApiPropertyOptional({ nullable: true })
  paidAt?: string | null;

  @ApiProperty()
  isOverdue!: boolean;

  @ApiPropertyOptional({ nullable: true })
  overdueSince?: string | null;

  @ApiProperty()
  remainingAmountCents!: string;
}

class TenantLedgerLineDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty({ enum: ['DEBIT', 'CREDIT'] })
  direction!: 'DEBIT' | 'CREDIT';

  @ApiProperty()
  amount!: string;
}

class TenantLedgerEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['DISBURSEMENT', 'REPAYMENT', 'ACCRUAL', 'WRITE_OFF', 'ADJUSTMENT'] })
  type!: 'DISBURSEMENT' | 'REPAYMENT' | 'ACCRUAL' | 'WRITE_OFF' | 'ADJUSTMENT';

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  idempotencyKey!: string;

  @ApiPropertyOptional({ nullable: true })
  memo?: string | null;

  @ApiProperty({ type: [TenantLedgerLineDto] })
  lines!: TenantLedgerLineDto[];
}

class TenantInterestAccrualAuditDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['PAUSED', 'RESUMED', 'RATE_OVERRIDE_SET', 'RATE_OVERRIDE_REMOVED'] })
  action!: 'PAUSED' | 'RESUMED' | 'RATE_OVERRIDE_SET' | 'RATE_OVERRIDE_REMOVED';

  @ApiPropertyOptional({ nullable: true })
  previousRate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  newRate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  reason?: string | null;

  @ApiProperty()
  performedById!: string;

  @ApiProperty()
  createdAt!: string;
}

export class TenantLoanApplicationDetailsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF', 'SETTLED', 'REPAID', 'DEFAULTED', 'REJECTED'] })
  status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'OVERDUE' | 'WRITTEN_OFF' | 'SETTLED' | 'REPAID' | 'DEFAULTED' | 'REJECTED';

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  dob?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  requestedAmount!: string;

  @ApiPropertyOptional({ nullable: true })
  approvedAmount?: string | null;

  @ApiPropertyOptional({ nullable: true })
  disbursedAmount?: string | null;

  @ApiProperty()
  outstandingPrincipal!: string;

  @ApiProperty()
  outstandingInterest!: string;

  @ApiProperty()
  outstandingFees!: string;

  @ApiProperty()
  totalOutstanding!: string;

  @ApiProperty({ enum: ['CURRENT', 'OVERDUE', 'CHARGED_OFF'] })
  delinquencyStatus!: 'CURRENT' | 'OVERDUE' | 'CHARGED_OFF';

  @ApiProperty()
  daysPastDue!: number;

  @ApiProperty()
  overdueAmountCents!: string;

  @ApiPropertyOptional({ nullable: true })
  lastDelinquencyCalcAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  annualInterestRate?: string | null;

  @ApiProperty()
  interestAccrualPaused!: boolean;

  @ApiPropertyOptional({ nullable: true })
  interestPausedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  interestPausedById?: string | null;

  @ApiPropertyOptional({ nullable: true })
  interestPauseReason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  interestOverrideRate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  interestOverrideSetAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  interestOverrideSetById?: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastAccruedAt?: string | null;

  @ApiProperty()
  tenorMonths!: number;

  @ApiPropertyOptional()
  purpose?: string;

  @ApiPropertyOptional()
  employmentStatus?: string;

  @ApiPropertyOptional()
  incomeBand?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [TenantLoanApplicationStatusHistoryDto] })
  histories!: TenantLoanApplicationStatusHistoryDto[];

  @ApiPropertyOptional({ type: TenantDisbursementDto, nullable: true })
  disbursement?: TenantDisbursementDto | null;

  @ApiProperty({ type: [TenantRepaymentDto] })
  repayments!: TenantRepaymentDto[];

  @ApiProperty({ type: [TenantRepaymentScheduleDto] })
  schedule!: TenantRepaymentScheduleDto[];

  @ApiProperty({ type: [TenantLedgerEntryDto] })
  ledgerEntries!: TenantLedgerEntryDto[];

  @ApiProperty({ type: [TenantInterestAccrualAuditDto] })
  interestAccrualAudits!: TenantInterestAccrualAuditDto[];
}
