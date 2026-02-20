import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

export type IdentityRiskResult = {
  riskScore: number;
  flags: string[];
};

type Input = {
  lenderId: string;
  userId: string;
  bvnHash: string;
  nameSimilarity: number;
  borrowerDob: Date | null;
  verifiedDob: Date | null;
};

@Injectable()
export class IdentityRiskService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(input: Input): Promise<IdentityRiskResult> {
    const identityVerification = (this.prisma as any).identityVerification;
    const flags: string[] = [];
    let riskScore = 0;

    if (input.nameSimilarity < 0.85) {
      flags.push('NAME_MISMATCH');
      riskScore += 40;
    }
    if (input.borrowerDob && input.verifiedDob && input.borrowerDob.getTime() !== input.verifiedDob.getTime()) {
      flags.push('DOB_MISMATCH');
      riskScore += 35;
    }

    const now = new Date();
    const lookback = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const attempts = await identityVerification.count({
      where: {
        lenderId: input.lenderId,
        userId: input.userId,
        createdAt: { gte: lookback }
      }
    });
    if (attempts >= 2) {
      flags.push('MULTIPLE_BVN_ATTEMPTS');
      riskScore += 30;
    }

    const reused = await identityVerification.findFirst({
      where: {
        lenderId: input.lenderId,
        bvnHash: input.bvnHash,
        userId: { not: input.userId }
      },
      select: { id: true }
    });
    if (reused) {
      flags.push('BVN_REUSED_ACROSS_USERS');
      riskScore += 70;
    }

    return { riskScore, flags };
  }
}
