import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerAccountType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { LedgerGuardService } from './ledger-guard.service';

type JournalLineInput = {
  accountId: string;
  debitMinor?: number;
  creditMinor?: number;
};

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerGuardService: LedgerGuardService
  ) {}

  async ensureCoreAccounts(tenantId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx ?? this.prisma;
    const core: Array<{ code: string; name: string; type: LedgerAccountType }> = [
      { code: 'CASH', name: 'Cash', type: LedgerAccountType.ASSET },
      {
        code: 'LOAN_PRINCIPAL_RECEIVABLE',
        name: 'Loan Principal Receivable',
        type: LedgerAccountType.ASSET
      },
      { code: 'INTEREST_RECEIVABLE', name: 'Interest Receivable', type: LedgerAccountType.ASSET },
      { code: 'FEE_RECEIVABLE', name: 'Fee Receivable', type: LedgerAccountType.ASSET },
      { code: 'SUSPENSE', name: 'Suspense', type: LedgerAccountType.ASSET }
    ];

    for (const item of core) {
      await db.ledgerAccount.upsert({
        where: {
          tenantId_code: {
            tenantId,
            code: item.code
          }
        },
        update: {
          name: item.name,
          type: item.type,
          isActive: true
        },
        create: {
          tenantId,
          code: item.code,
          name: item.name,
          type: item.type
        }
      });
    }
  }

  async createJournalEntry(params: {
    tenantId: string;
    referenceType: string;
    referenceId?: string;
    description?: string;
    createdBy?: string;
    lines: JournalLineInput[];
  }, tx?: Prisma.TransactionClient) {
    const lines = params.lines ?? [];
    if (lines.length < 2) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'At least 2 journal lines are required.',
        details: null
      });
    }

    let debitTotal = 0;
    let creditTotal = 0;
    const normalized = lines.map((line, index) => {
      const debitMinor = line.debitMinor ?? 0;
      const creditMinor = line.creditMinor ?? 0;
      if (!line.accountId?.trim()) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'accountId is required.',
          details: { index }
        });
      }
      if (debitMinor < 0 || creditMinor < 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Negative values are not allowed.',
          details: { index }
        });
      }
      if (debitMinor === 0 && creditMinor === 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Each line must carry debitMinor or creditMinor.',
          details: { index }
        });
      }
      if (debitMinor > 0 && creditMinor > 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Line cannot have both debitMinor and creditMinor.',
          details: { index }
        });
      }
      debitTotal += debitMinor;
      creditTotal += creditMinor;
      return {
        accountId: line.accountId.trim(),
        debitMinor,
        creditMinor
      };
    });

    this.ledgerGuardService.validateTransactionBalanced(
      normalized.map((line) => ({
        accountId: line.accountId,
        debitMinor: line.debitMinor,
        creditMinor: line.creditMinor
      }))
    );

    const write = async (db: Prisma.TransactionClient) => {
      const accounts = await db.ledgerAccount.findMany({
        where: {
          tenantId: params.tenantId,
          id: { in: normalized.map((line) => line.accountId) }
        },
        select: { id: true }
      });
      if (accounts.length !== new Set(normalized.map((line) => line.accountId)).size) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'One or more accounts were not found for tenant.',
          details: null
        });
      }

      const entry = await db.journalEntry.create({
        data: {
          tenantId: params.tenantId,
          referenceType: params.referenceType,
          referenceId: params.referenceId ?? null,
          description: params.description ?? null,
          createdBy: params.createdBy ?? null
        }
      });

      await db.journalLine.createMany({
        data: normalized.map((line) => ({
          tenantId: params.tenantId,
          journalEntryId: entry.id,
          accountId: line.accountId,
          ledgerAccountId: line.accountId,
          debitMinor: line.debitMinor,
          creditMinor: line.creditMinor,
          entryType: line.debitMinor > 0 ? 'DEBIT' : 'CREDIT',
          amountKobo: line.debitMinor > 0 ? line.debitMinor : line.creditMinor
        }))
      });

      return {
        id: entry.id,
        tenantId: entry.tenantId,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        debitMinor: debitTotal,
        creditMinor: creditTotal
      };
    };

    if (tx) {
      return write(tx);
    }
    return this.prisma.$transaction(write);
  }
}
