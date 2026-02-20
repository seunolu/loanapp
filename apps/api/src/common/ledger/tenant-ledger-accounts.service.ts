import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TENANT_LEDGER_DEFAULT_ACCOUNTS } from './ledger.accounts';

@Injectable()
export class TenantLedgerAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultAccounts(tenantId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx ?? this.prisma;
    for (const account of TENANT_LEDGER_DEFAULT_ACCOUNTS) {
      await db.tenantLedgerAccount.upsert({
        where: {
          tenantId_code: {
            tenantId,
            code: account.code
          }
        },
        update: {
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          currency: account.currency,
          isSystem: account.isSystem
        },
        create: {
          tenantId,
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          currency: account.currency,
          isSystem: account.isSystem
        }
      });
    }
  }
}
