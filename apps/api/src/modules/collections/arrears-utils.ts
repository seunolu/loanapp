import { CollectionsStage, Prisma } from '@prisma/client';

export function calculateDpd(now: Date, earliestUnpaidDueAt: Date | null): number {
  if (!earliestUnpaidDueAt) {
    return 0;
  }
  const diff = now.getTime() - earliestUnpaidDueAt.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function determineCollectionsStage(dpd: number): CollectionsStage {
  if (dpd >= 61) return CollectionsStage.LEGAL;
  if (dpd >= 15) return CollectionsStage.FIELD;
  return CollectionsStage.SOFT;
}

export function sumOutstanding(items: Array<{ totalDue: Prisma.Decimal; totalPaid: Prisma.Decimal }>): Prisma.Decimal {
  return items.reduce((sum, item) => {
    const remaining = Prisma.Decimal.max(new Prisma.Decimal(0), item.totalDue.minus(item.totalPaid));
    return sum.plus(remaining);
  }, new Prisma.Decimal(0));
}

