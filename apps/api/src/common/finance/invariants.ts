import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, TenantLoanApplicationStatus } from '@prisma/client';

export function assertLoanNonNegative(input: {
  outstandingPrincipal: Prisma.Decimal;
  outstandingInterest: Prisma.Decimal;
  outstandingFees: Prisma.Decimal;
  outstandingTotal: Prisma.Decimal;
}): void {
  if (
    input.outstandingPrincipal.lt(0) ||
    input.outstandingInterest.lt(0) ||
    input.outstandingFees.lt(0) ||
    input.outstandingTotal.lt(0)
  ) {
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'Loan outstanding fields cannot be negative.',
      details: {
        outstandingPrincipal: input.outstandingPrincipal.toString(),
        outstandingInterest: input.outstandingInterest.toString(),
        outstandingFees: input.outstandingFees.toString(),
        outstandingTotal: input.outstandingTotal.toString()
      }
    });
  }
}

export function assertLoanCanClose(input: {
  status: TenantLoanApplicationStatus;
  outstandingTotal: Prisma.Decimal;
}): void {
  if (input.status === TenantLoanApplicationStatus.REPAID && !input.outstandingTotal.eq(0)) {
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'Loan cannot be closed with outstanding balance.',
      details: { outstandingTotal: input.outstandingTotal.toString() }
    });
  }
}

export function assertNoDuplicateDisbursement(successfulDisbursementCount: number): void {
  if (successfulDisbursementCount > 1) {
    throw new ConflictException({
      code: 'CONFLICT',
      message: 'Loan has multiple successful disbursements.',
      details: null
    });
  }
}
