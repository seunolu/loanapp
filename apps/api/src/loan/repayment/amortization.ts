import { Prisma, RepaymentFrequency } from '@prisma/client';

export type InterestMethod = 'REDUCING_BALANCE' | 'FLAT';

export type GenerateScheduleInput = {
  principal: Prisma.Decimal | number | string;
  annualInterestRateBps: number;
  startDate: Date;
  repaymentFrequency: RepaymentFrequency;
  termInDays: number;
  interestMethod?: InterestMethod;
  feesTotal?: Prisma.Decimal | number | string;
};

export type ScheduleItem = {
  installmentNumber: number;
  dueDate: Date;
  principalDue: Prisma.Decimal;
  interestDue: Prisma.Decimal;
  feesDue: Prisma.Decimal;
  totalDue: Prisma.Decimal;
};

const HUNDRED = new Prisma.Decimal(100);
const BPS_DENOM = new Prisma.Decimal(10_000);
const EPSILON = new Prisma.Decimal('0.01');

function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function toDecimal(value: Prisma.Decimal | number | string | undefined): Prisma.Decimal {
  return new Prisma.Decimal(value ?? 0);
}

function periodsPerYear(frequency: RepaymentFrequency): number {
  switch (frequency) {
    case RepaymentFrequency.DAILY:
      return 365;
    case RepaymentFrequency.WEEKLY:
      return 52;
    case RepaymentFrequency.BIWEEKLY:
      return 26;
    case RepaymentFrequency.MONTHLY:
      return 12;
    default:
      return 12;
  }
}

function installmentCount(termInDays: number, frequency: RepaymentFrequency): number {
  if (termInDays <= 0) {
    return 0;
  }
  switch (frequency) {
    case RepaymentFrequency.DAILY:
      return termInDays;
    case RepaymentFrequency.WEEKLY:
      return Math.ceil(termInDays / 7);
    case RepaymentFrequency.BIWEEKLY:
      return Math.ceil(termInDays / 14);
    case RepaymentFrequency.MONTHLY:
      return Math.ceil(termInDays / 30);
    default:
      return Math.ceil(termInDays / 30);
  }
}

function addPeriod(startDate: Date, frequency: RepaymentFrequency, periodsToAdd: number): Date {
  const next = new Date(startDate);
  switch (frequency) {
    case RepaymentFrequency.DAILY:
      next.setUTCDate(next.getUTCDate() + periodsToAdd);
      break;
    case RepaymentFrequency.WEEKLY:
      next.setUTCDate(next.getUTCDate() + periodsToAdd * 7);
      break;
    case RepaymentFrequency.BIWEEKLY:
      next.setUTCDate(next.getUTCDate() + periodsToAdd * 14);
      break;
    case RepaymentFrequency.MONTHLY:
      next.setUTCMonth(next.getUTCMonth() + periodsToAdd);
      break;
    default:
      next.setUTCMonth(next.getUTCMonth() + periodsToAdd);
      break;
  }
  return next;
}

export function generateSchedule(input: GenerateScheduleInput): ScheduleItem[] {
  const principal = roundMoney(toDecimal(input.principal));
  const annualBps = input.annualInterestRateBps;
  const method = input.interestMethod ?? 'REDUCING_BALANCE';
  const count = installmentCount(input.termInDays, input.repaymentFrequency);
  const feesTotal = roundMoney(toDecimal(input.feesTotal));

  if (count <= 0 || principal.lte(0)) {
    return [];
  }

  const periodRate = new Prisma.Decimal(annualBps)
    .div(BPS_DENOM)
    .div(periodsPerYear(input.repaymentFrequency));

  const basePrincipal = roundMoney(principal.div(count));
  const principalLines: Prisma.Decimal[] = [];
  let principalRemaining = principal;
  for (let i = 1; i <= count; i += 1) {
    if (i === count) {
      principalLines.push(roundMoney(principalRemaining));
      break;
    }
    const piece = Prisma.Decimal.min(basePrincipal, principalRemaining);
    principalLines.push(roundMoney(piece));
    principalRemaining = principalRemaining.minus(piece);
  }

  const feesBase = count > 0 ? roundMoney(feesTotal.div(count)) : new Prisma.Decimal(0);
  const feesLines: Prisma.Decimal[] = [];
  let feesRemaining = feesTotal;
  for (let i = 1; i <= count; i += 1) {
    if (i === count) {
      feesLines.push(roundMoney(feesRemaining));
      break;
    }
    const piece = Prisma.Decimal.min(feesBase, feesRemaining);
    feesLines.push(roundMoney(piece));
    feesRemaining = feesRemaining.minus(piece);
  }

  const schedule: ScheduleItem[] = [];
  let reducingPrincipal = principal;
  let flatInterestRemaining = new Prisma.Decimal(0);
  if (method === 'FLAT') {
    flatInterestRemaining = roundMoney(
      principal
        .times(new Prisma.Decimal(annualBps).div(BPS_DENOM))
        .times(new Prisma.Decimal(input.termInDays).div(365))
    );
  }
  const flatBase = method === 'FLAT' ? roundMoney(flatInterestRemaining.div(count)) : new Prisma.Decimal(0);

  for (let i = 0; i < count; i += 1) {
    const principalDue = principalLines[i] ?? new Prisma.Decimal(0);
    const feesDue = feesLines[i] ?? new Prisma.Decimal(0);

    const interestDue =
      method === 'FLAT'
        ? i === count - 1
          ? roundMoney(flatInterestRemaining)
          : roundMoney(flatBase)
        : roundMoney(reducingPrincipal.times(periodRate));

    if (method === 'FLAT') {
      flatInterestRemaining = flatInterestRemaining.minus(interestDue);
    }

    const totalDue = roundMoney(principalDue.plus(interestDue).plus(feesDue));
    schedule.push({
      installmentNumber: i + 1,
      dueDate: addPeriod(input.startDate, input.repaymentFrequency, i + 1),
      principalDue,
      interestDue,
      feesDue,
      totalDue
    });

    reducingPrincipal = reducingPrincipal.minus(principalDue);
    if (reducingPrincipal.abs().lt(EPSILON)) {
      reducingPrincipal = new Prisma.Decimal(0);
    }
  }

  const principalSum = schedule.reduce((sum, item) => sum.plus(item.principalDue), new Prisma.Decimal(0));
  const principalDiff = roundMoney(principal.minus(principalSum));
  if (!principalDiff.eq(0) && schedule.length > 0) {
    const last = schedule[schedule.length - 1];
    last.principalDue = roundMoney(last.principalDue.plus(principalDiff));
    last.totalDue = roundMoney(last.principalDue.plus(last.interestDue).plus(last.feesDue));
  }

  const feesSum = schedule.reduce((sum, item) => sum.plus(item.feesDue), new Prisma.Decimal(0));
  const feesDiff = roundMoney(feesTotal.minus(feesSum));
  if (!feesDiff.eq(0) && schedule.length > 0) {
    const last = schedule[schedule.length - 1];
    last.feesDue = roundMoney(last.feesDue.plus(feesDiff));
    last.totalDue = roundMoney(last.principalDue.plus(last.interestDue).plus(last.feesDue));
  }

  return schedule;
}
