import { Prisma } from '@prisma/client';

export type AllocationResult = {
  feesPaid: Prisma.Decimal;
  interestPaid: Prisma.Decimal;
  principalPaid: Prisma.Decimal;
  remaining: Prisma.Decimal;
};

export function allocateRepayment(
  amount: Prisma.Decimal | number | string,
  outstandingFees: Prisma.Decimal | number | string,
  outstandingInterest: Prisma.Decimal | number | string,
  outstandingPrincipal: Prisma.Decimal | number | string
): AllocationResult {
  let remaining = new Prisma.Decimal(amount);
  const fees = new Prisma.Decimal(outstandingFees);
  const interest = new Prisma.Decimal(outstandingInterest);
  const principal = new Prisma.Decimal(outstandingPrincipal);

  const feesPaid = Prisma.Decimal.min(fees, remaining);
  remaining = remaining.minus(feesPaid);

  const interestPaid = Prisma.Decimal.min(interest, remaining);
  remaining = remaining.minus(interestPaid);

  const principalPaid = Prisma.Decimal.min(principal, remaining);
  remaining = remaining.minus(principalPaid);

  return {
    feesPaid,
    interestPaid,
    principalPaid,
    remaining
  };
}
