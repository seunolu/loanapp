import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type PricingOverride = {
  interestRateBpsMonthly?: number;
  originationFeeKoboFlat?: number;
  originationFeeBps?: number;
  scheduleType?: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL';
  offerExpiryHours?: number;
};

type CalculateOfferInput = {
  amountRequested: number;
  tenorDays: number;
  lenderSettings: Prisma.JsonValue | null;
  pricingOverride?: PricingOverride;
  now?: Date;
};

export type OfferCalculation = {
  principalAmount: number;
  interestAmount: number;
  feeAmount: number;
  totalRepayable: number;
  expiresAt: Date;
  scheduleType: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL';
  schedule: Array<{
    dueDate: Date;
    amount: number;
  }>;
  pricingSnapshot: {
    interestRateBpsMonthly: number;
    originationFeeKoboFlat: number;
    originationFeeBps: number;
    scheduleType: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL';
    offerExpiryHours: number;
  };
};

@Injectable()
export class OfferCalculatorService {
  private static readonly DEFAULTS = {
    interestRateBpsMonthly: 500,
    originationFeeKoboFlat: 0,
    originationFeeBps: 0,
    scheduleType: 'BULLET' as const,
    offerExpiryHours: 168
  };

  calculate(input: CalculateOfferInput): OfferCalculation {
    const policy = this.getPolicy(input.lenderSettings);
    const interestRateBpsMonthly =
      input.pricingOverride?.interestRateBpsMonthly ?? policy.interestRateBpsMonthly;
    const originationFeeKoboFlat =
      input.pricingOverride?.originationFeeKoboFlat ?? policy.originationFeeKoboFlat;
    const originationFeeBps = input.pricingOverride?.originationFeeBps ?? policy.originationFeeBps;
    const scheduleType = input.pricingOverride?.scheduleType ?? policy.scheduleType;
    const offerExpiryHours = input.pricingOverride?.offerExpiryHours ?? policy.offerExpiryHours;

    const principalAmount = input.amountRequested;
    const dailyRate = interestRateBpsMonthly / 10_000 / 30;
    const interestAmount = Math.round(principalAmount * dailyRate * input.tenorDays);
    const bpsFee = Math.round((principalAmount * originationFeeBps) / 10_000);
    const feeAmount = originationFeeKoboFlat + bpsFee;
    const totalRepayable = principalAmount + interestAmount + feeAmount;

    const now = input.now ?? new Date();
    const schedule = this.buildSchedule(scheduleType, now, input.tenorDays, totalRepayable);
    const expiresAt = new Date(now.getTime() + offerExpiryHours * 60 * 60 * 1000);

    return {
      principalAmount,
      interestAmount,
      feeAmount,
      totalRepayable,
      expiresAt,
      scheduleType,
      schedule,
      pricingSnapshot: {
        interestRateBpsMonthly,
        originationFeeKoboFlat,
        originationFeeBps,
        scheduleType,
        offerExpiryHours
      }
    };
  }

  private getPolicy(lenderSettings: Prisma.JsonValue | null) {
    const settings =
      lenderSettings && typeof lenderSettings === 'object' && !Array.isArray(lenderSettings)
        ? (lenderSettings as Record<string, unknown>)
        : {};
    const policy =
      settings.policy && typeof settings.policy === 'object' && !Array.isArray(settings.policy)
        ? (settings.policy as Record<string, unknown>)
        : {};

    return {
      interestRateBpsMonthly: this.asNonNegativeInt(
        policy.interestRateBpsMonthly,
        OfferCalculatorService.DEFAULTS.interestRateBpsMonthly
      ),
      originationFeeKoboFlat: this.asNonNegativeInt(
        policy.originationFeeKoboFlat,
        OfferCalculatorService.DEFAULTS.originationFeeKoboFlat
      ),
      originationFeeBps: this.asNonNegativeInt(
        policy.originationFeeBps,
        OfferCalculatorService.DEFAULTS.originationFeeBps
      ),
      scheduleType: this.asScheduleType(policy.scheduleType, OfferCalculatorService.DEFAULTS.scheduleType),
      offerExpiryHours: this.asPositiveInt(policy.offerExpiryHours, OfferCalculatorService.DEFAULTS.offerExpiryHours)
    };
  }

  private buildSchedule(
    scheduleType: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL',
    from: Date,
    tenorDays: number,
    totalRepayable: number
  ): Array<{ dueDate: Date; amount: number }> {
    if (scheduleType === 'BULLET') {
      return [
        {
          dueDate: new Date(from.getTime() + tenorDays * 24 * 60 * 60 * 1000),
          amount: totalRepayable
        }
      ];
    }

    const chunkDays = scheduleType === 'WEEKLY_EQUAL' ? 7 : 30;
    const installmentCount = Math.max(1, Math.ceil(tenorDays / chunkDays));
    const baseAmount = Math.floor(totalRepayable / installmentCount);
    const remainder = totalRepayable - baseAmount * installmentCount;

    const items: Array<{ dueDate: Date; amount: number }> = [];
    for (let i = 1; i <= installmentCount; i += 1) {
      const amount = i === installmentCount ? baseAmount + remainder : baseAmount;
      items.push({
        dueDate: new Date(from.getTime() + i * chunkDays * 24 * 60 * 60 * 1000),
        amount
      });
    }
    return items;
  }

  private asPositiveInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private asNonNegativeInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
  }

  private asScheduleType(
    value: unknown,
    fallback: 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL'
  ): 'BULLET' | 'WEEKLY_EQUAL' | 'MONTHLY_EQUAL' {
    return value === 'BULLET' || value === 'WEEKLY_EQUAL' || value === 'MONTHLY_EQUAL' ? value : fallback;
  }
}
