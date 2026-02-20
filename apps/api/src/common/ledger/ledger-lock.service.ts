import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LedgerLockService {
  constructor(private readonly prisma: PrismaService) {}

  async lockLoanApplication(
    tenantId: string,
    loanApplicationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx ?? this.prisma;
    await db.$queryRaw`
      SELECT id
      FROM "TenantLoanApplication"
      WHERE id = ${loanApplicationId}
        AND "tenantId" = ${tenantId}
      FOR UPDATE
    `;
  }
}
