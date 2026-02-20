import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type FeatureFlagKey =
  | 'AUTO_APPROVAL'
  | 'AUTO_DISBURSE'
  | 'INTEREST_ACCRUAL'
  | 'COLLECTIONS_AUTOMATION';

const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  AUTO_APPROVAL: false,
  AUTO_DISBURSE: false,
  INTEREST_ACCRUAL: true,
  COLLECTIONS_AUTOMATION: true
};

@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(tenantId: string, key: FeatureFlagKey): Promise<boolean> {
    const row = await (this.prisma as any).featureFlag.findUnique({
      where: { tenantId_key: { tenantId, key } },
      select: { enabled: true }
    });
    return row?.enabled ?? DEFAULTS[key];
  }
}
