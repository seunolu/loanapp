import { FeeApplyAt, FeeType, InterestType, RepaymentFrequency } from '@prisma/client';

export type OfferEngineProduct = {
  id: string;
  name: string;
  currency: string;
  interestType: InterestType;
  interestRateBps: number;
  repaymentFrequency: RepaymentFrequency;
  graceDays: number;
};

export type OfferEngineFee = {
  id: string;
  name: string;
  type: FeeType;
  amount: number;
  applyAt: FeeApplyAt;
};

export type OfferInstallment = {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  total: number;
};

export type ComputeOfferResult = {
  schedule: OfferInstallment[];
  totals: {
    principal: number;
    interest: number;
    fees: number;
    total: number;
  };
  effectiveAprBps: number;
};

function installmentCount(frequency: RepaymentFrequency, tenorDays: number): number {
  if (frequency === RepaymentFrequency.DAILY) return Math.max(1, tenorDays);
  if (frequency === RepaymentFrequency.WEEKLY) return Math.max(1, Math.ceil(tenorDays / 7));
  if (frequency === RepaymentFrequency.BIWEEKLY) return Math.max(1, Math.ceil(tenorDays / 14));
  return Math.max(1, Math.ceil(tenorDays / 30));
}

function intervalDays(frequency: RepaymentFrequency): number {
  if (frequency === RepaymentFrequency.DAILY) return 1;
  if (frequency === RepaymentFrequency.WEEKLY) return 7;
  if (frequency === RepaymentFrequency.BIWEEKLY) return 14;
  return 30;
}

function distribute(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  const values = new Array<number>(count).fill(base);
  values[count - 1] += remainder;
  return values;
}

function allocatePeriodDays(tenorDays: number, count: number): number[] {
  return distribute(tenorDays, count);
}

function feeTotal(principalMinor: number, fee: OfferEngineFee): number {
  if (fee.type === FeeType.FIXED) {
    return fee.amount;
  }
  return Math.floor((principalMinor * fee.amount) / 10000);
}

export function computeOffer(
  product: OfferEngineProduct,
  fees: OfferEngineFee[],
  input: { principalMinor: number; tenorDays: number; startDate: Date }
): ComputeOfferResult {
  const count = installmentCount(product.repaymentFrequency, input.tenorDays);
  const intervals = allocatePeriodDays(input.tenorDays, count);
  const principalParts = distribute(input.principalMinor, count);
  const interestParts = new Array<number>(count).fill(0);
  const feeParts = new Array<number>(count).fill(0);

  if (product.interestType === InterestType.FLAT) {
    const totalInterest = Math.floor(
      (input.principalMinor * product.interestRateBps * input.tenorDays) / (365 * 10000)
    );
    const flatParts = distribute(totalInterest, count);
    for (let i = 0; i < count; i += 1) {
      interestParts[i] = flatParts[i];
    }
  } else {
    let remainingPrincipal = input.principalMinor;
    for (let i = 0; i < count; i += 1) {
      const days = intervals[i];
      const interest = Math.floor((remainingPrincipal * product.interestRateBps * days) / (365 * 10000));
      interestParts[i] = interest;
      remainingPrincipal -= principalParts[i];
    }
  }

  for (const fee of fees) {
    const total = feeTotal(input.principalMinor, fee);
    if (fee.applyAt === FeeApplyAt.UPFRONT) {
      feeParts[0] += total;
      continue;
    }
    if (fee.applyAt === FeeApplyAt.END) {
      feeParts[count - 1] += total;
      continue;
    }
    const spread = distribute(total, count);
    for (let i = 0; i < count; i += 1) {
      feeParts[i] += spread[i];
    }
  }

  const interval = intervalDays(product.repaymentFrequency);
  const baseDate = new Date(input.startDate);
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() + Math.max(0, product.graceDays));

  const schedule: OfferInstallment[] = [];
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalFees = 0;
  for (let i = 0; i < count; i += 1) {
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + interval * (i + 1));
    const principal = principalParts[i];
    const interest = interestParts[i];
    const feesMinor = feeParts[i];
    const total = principal + interest + feesMinor;
    totalPrincipal += principal;
    totalInterest += interest;
    totalFees += feesMinor;
    schedule.push({
      installmentNo: i + 1,
      dueDate: dueDate.toISOString(),
      principal,
      interest,
      fees: feesMinor,
      total
    });
  }

  const total = totalPrincipal + totalInterest + totalFees;
  const effectiveAprBps =
    input.principalMinor > 0 && input.tenorDays > 0
      ? Math.floor(((totalInterest + totalFees) * 365 * 10000) / (input.principalMinor * input.tenorDays))
      : 0;

  return {
    schedule,
    totals: {
      principal: totalPrincipal,
      interest: totalInterest,
      fees: totalFees,
      total
    },
    effectiveAprBps
  };
}
