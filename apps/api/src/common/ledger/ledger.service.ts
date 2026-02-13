import { BadRequestException, Injectable } from '@nestjs/common';
import { JournalLineType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type LedgerPostLineInput = {
  accountCode: string;
  entryType: 'DEBIT' | 'CREDIT';
  amountKobo: number;
  description?: string;
};

export type LedgerPostJournalEntryInput = {
  description?: string;
  reference?: string;
  requestId?: string;
  lines: LedgerPostLineInput[];
};

export type LedgerPostedJournalEntry = {
  journalEntryId: string;
  debitTotalKobo: number;
  creditTotalKobo: number;
  lineCount: number;
};

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async postJournalEntry(
    input: LedgerPostJournalEntryInput,
    dbClient?: Prisma.TransactionClient
  ): Promise<LedgerPostedJournalEntry> {
    if (!Array.isArray(input.lines) || input.lines.length < 2) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Journal entry requires at least two lines.',
        details: {
          field: 'lines'
        }
      });
    }

    let debitTotalKobo = 0;
    let creditTotalKobo = 0;
    const normalizedLines = input.lines.map((line, index) => {
      const accountCode = line.accountCode.trim();
      const entryType = line.entryType;
      const amountKobo = line.amountKobo;

      if (!accountCode) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'accountCode is required for every journal line.',
          details: { index, field: 'accountCode' }
        });
      }

      if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'amountKobo must be a positive integer.',
          details: { index, field: 'amountKobo' }
        });
      }

      if (entryType !== 'DEBIT' && entryType !== 'CREDIT') {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'entryType must be DEBIT or CREDIT.',
          details: { index, field: 'entryType' }
        });
      }

      if (entryType === 'DEBIT') {
        debitTotalKobo += amountKobo;
      } else {
        creditTotalKobo += amountKobo;
      }

      return {
        accountCode,
        entryType,
        amountKobo,
        description: line.description?.trim() || null
      };
    });

    if (debitTotalKobo !== creditTotalKobo) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Journal entry must be balanced: debit total must equal credit total.',
        details: {
          debitTotalKobo,
          creditTotalKobo
        }
      });
    }

    const writeWithClient = async (client: Prisma.TransactionClient): Promise<string> => {
      const uniqueCodes = [...new Set(normalizedLines.map((line) => line.accountCode))];
      const accounts = await client.ledgerAccount.findMany({
        where: {
          code: { in: uniqueCodes },
          isActive: true
        },
        select: {
          id: true,
          code: true
        }
      });

      if (accounts.length !== uniqueCodes.length) {
        const foundCodes = new Set(accounts.map((account) => account.code));
        const missingCodes = uniqueCodes.filter((code) => !foundCodes.has(code));
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'One or more ledger account codes do not exist or are inactive.',
          details: {
            missingCodes
          }
        });
      }

      const accountByCode = new Map<string, { id: string }>();
      for (const account of accounts) {
        accountByCode.set(account.code, { id: account.id });
      }

      const entry = await client.journalEntry.create({
        data: {
          description: input.description?.trim() || null,
          reference: input.reference?.trim() || null,
          requestId: input.requestId?.trim() || null
        }
      });

      await client.journalLine.createMany({
        data: normalizedLines.map((line) => ({
          journalEntryId: entry.id,
          ledgerAccountId: accountByCode.get(line.accountCode)!.id,
          entryType: line.entryType === 'DEBIT' ? JournalLineType.DEBIT : JournalLineType.CREDIT,
          amountKobo: line.amountKobo,
          description: line.description
        }))
      });

      return entry.id;
    };

    const result = dbClient ? await writeWithClient(dbClient) : await this.prisma.$transaction(writeWithClient);

    return {
      journalEntryId: result,
      debitTotalKobo,
      creditTotalKobo,
      lineCount: normalizedLines.length
    };
  }
}
