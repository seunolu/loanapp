import { Injectable, Scope } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { PrismaService } from '../../common/database/prisma.service';
import type { BankAccountDto } from './dto/bank-account.dto';
import type { UpsertBankAccountDto } from './dto/upsert-bank-account.dto';

@Injectable({ scope: Scope.REQUEST })
export class BankAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async upsert(principal: BorrowerPrincipal, input: UpsertBankAccountDto): Promise<BankAccountDto> {
    const borrowerId = principal.borrowerId;
    const bankCode = input.bankCode.trim();
    const bankName = input.bankName.trim();
    const accountNumber = input.accountNumber.trim();
    const accountName = input.accountName.trim();

    const isFirstAccount = (await this.prisma.bankAccount.count({ where: { borrowerId } })) === 0;
    const shouldBeDefault = input.isDefault === true || isFirstAccount;

    const account = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.bankAccount.updateMany({
          where: { borrowerId },
          data: { isDefault: false }
        });
      }

      const record = await tx.bankAccount.upsert({
        where: {
          borrowerId_bankCode_accountNumber: {
            borrowerId,
            bankCode,
            accountNumber
          }
        },
        update: {
          bankName,
          accountName,
          isDefault: shouldBeDefault ? true : undefined
        },
        create: {
          borrowerId,
          bankCode,
          bankName,
          accountNumber,
          accountName,
          isDefault: shouldBeDefault
        }
      });

      if (!shouldBeDefault) {
        const hasDefault = await tx.bankAccount.count({
          where: { borrowerId, isDefault: true }
        });
        if (hasDefault === 0) {
          return tx.bankAccount.update({
            where: { id: record.id },
            data: { isDefault: true }
          });
        }
      }

      return record;
    });

    await this.auditService.write({
      event: 'BANK_ACCOUNT_UPSERTED',
      actorType: 'BORROWER',
      actorId: borrowerId,
      metadata: {
        bankAccountId: account.id,
        bankCode: account.bankCode,
        accountNumberLast4: account.accountNumber.slice(-4),
        isDefault: account.isDefault
      }
    });

    return this.toDto(account);
  }

  async list(principal: BorrowerPrincipal): Promise<BankAccountDto[]> {
    const records = await this.prisma.bankAccount.findMany({
      where: { borrowerId: principal.borrowerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    return records.map((record) => this.toDto(record));
  }

  private toDto(input: {
    id: string;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    isDefault: boolean;
    createdAt: Date;
  }): BankAccountDto {
    return {
      id: input.id,
      bankCode: input.bankCode,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      isDefault: input.isDefault,
      createdAt: input.createdAt.toISOString()
    };
  }
}
