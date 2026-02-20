import { BadRequestException } from '@nestjs/common';
import { TenantLoanApplicationStatus } from '@prisma/client';

const TRANSITION_MAP: Record<TenantLoanApplicationStatus, TenantLoanApplicationStatus[]> = {
  DRAFT: [TenantLoanApplicationStatus.SUBMITTED],
  SUBMITTED: [TenantLoanApplicationStatus.UNDER_REVIEW, TenantLoanApplicationStatus.REJECTED],
  UNDER_REVIEW: [
    TenantLoanApplicationStatus.REQUESTED_DOCUMENTS,
    TenantLoanApplicationStatus.APPROVED,
    TenantLoanApplicationStatus.REJECTED
  ],
  REQUESTED_DOCUMENTS: [TenantLoanApplicationStatus.UNDER_REVIEW],
  APPROVED: [TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT],
  READY_FOR_DISBURSEMENT: [TenantLoanApplicationStatus.APPROVED, TenantLoanApplicationStatus.DISBURSED],
  DISBURSED: [
    TenantLoanApplicationStatus.OVERDUE,
    TenantLoanApplicationStatus.SETTLED,
    TenantLoanApplicationStatus.REPAID,
    TenantLoanApplicationStatus.DEFAULTED
  ],
  OVERDUE: [
    TenantLoanApplicationStatus.DISBURSED,
    TenantLoanApplicationStatus.WRITTEN_OFF,
    TenantLoanApplicationStatus.SETTLED,
    TenantLoanApplicationStatus.REPAID,
    TenantLoanApplicationStatus.DEFAULTED
  ],
  WRITTEN_OFF: [TenantLoanApplicationStatus.SETTLED],
  SETTLED: [],
  REPAID: [],
  DEFAULTED: [],
  REJECTED: []
};

export function getAllowedTransitions(from: TenantLoanApplicationStatus): TenantLoanApplicationStatus[] {
  return TRANSITION_MAP[from] ?? [];
}

export function assertValidTransition(
  from: TenantLoanApplicationStatus,
  to: TenantLoanApplicationStatus
): void {
  const allowed = getAllowedTransitions(from);
  if (allowed.includes(to)) {
    return;
  }

  throw new BadRequestException({
    code: 'BAD_REQUEST',
    message: `Invalid status transition from ${from} to ${to}.`,
    details: {
      from,
      to,
      allowedTo: allowed
    }
  });
}
