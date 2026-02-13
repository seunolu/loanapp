import { BadRequestException, ConflictException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { DisbursementStatus, LoanStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { LedgerService } from '../../common/ledger/ledger.service';
import { NotificationsService } from '../../common/notifications/notifications.service';
import type { CreateDisbursementDto } from './dto/create-disbursement.dto';
import type { CreateDisbursementResponseDto } from './dto/create-disbursement-response.dto';
import type { DisbursementStatusResponseDto } from './dto/disbursement-status-response.dto';
import type { MarkFailedDisbursementDto } from './dto/mark-failed-disbursement.dto';

@Injectable({ scope: Scope.REQUEST })
export class AdminDisbursementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly ledgerService: LedgerService,
    private readonly notificationsService: NotificationsService
  ) {}

  async create(admin: AdminPrincipal, input: CreateDisbursementDto): Promise<CreateDisbursementResponseDto> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: input.loanId.trim() },
      select: {
        id: true,
        lenderId: true,
        borrowerId: true,
        status: true,
        principalAmount: true
      }
    });

    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan not found.',
        details: null
      });
    }

    if (loan.lenderId !== admin.lenderId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan not found.',
        details: null
      });
    }

    if (loan.status !== LoanStatus.PENDING_DISBURSEMENT) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Loan is not in PENDING_DISBURSEMENT status.',
        details: {
          loanId: loan.id,
          status: loan.status
        }
      });
    }

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: input.bankAccountId.trim() },
      select: {
        id: true,
        borrowerId: true
      }
    });

    if (!bankAccount) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Bank account not found.',
        details: null
      });
    }

    if (bankAccount.borrowerId !== loan.borrowerId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Bank account does not belong to the loan borrower.',
        details: {
          loanId: loan.id,
          bankAccountId: bankAccount.id
        }
      });
    }

    const existing = await this.prisma.disbursement.findUnique({
      where: { loanId: loan.id },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Disbursement already exists for this loan.',
        details: {
          loanId: loan.id,
          disbursementId: existing.id
        }
      });
    }

    const created = await this.prisma.disbursement.create({
      data: {
        lenderId: admin.lenderId,
        loanId: loan.id,
        bankAccountId: bankAccount.id,
        amountKobo: loan.principalAmount,
        initiatedBy: admin.adminId
      }
    });

    await this.auditService.write({
      event: 'DISBURSEMENT_INITIATED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        disbursementId: created.id,
        loanId: created.loanId,
        bankAccountId: created.bankAccountId,
        amountKobo: created.amountKobo
      }
    });

    return {
      disbursementId: created.id,
      loanId: created.loanId,
      status: 'INITIATED',
      amountKobo: created.amountKobo
    };
  }

  async markProcessing(admin: AdminPrincipal, id: string): Promise<DisbursementStatusResponseDto> {
    const disbursement = await this.getDisbursementOrThrow(id, admin.lenderId);
    if (disbursement.status !== DisbursementStatus.INITIATED) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Only INITIATED disbursements can be marked PROCESSING.',
        details: {
          disbursementId: disbursement.id,
          status: disbursement.status
        }
      });
    }

    const updated = await this.prisma.disbursement.update({
      where: { id: disbursement.id },
      data: { status: DisbursementStatus.PROCESSING }
    });

    await this.auditService.write({
      event: 'DISBURSEMENT_PROCESSING',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        disbursementId: updated.id,
        loanId: updated.loanId
      }
    });

    return this.toStatusResponse(updated);
  }

  async markSucceeded(admin: AdminPrincipal, id: string): Promise<DisbursementStatusResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const disbursement = await tx.disbursement.findUnique({
        where: { id },
        include: {
          loan: {
            include: {
              borrower: {
                select: {
                  phone: true
                }
              }
            }
          }
        }
      });

      if (!disbursement) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Disbursement not found.',
          details: null
        });
      }

      if (disbursement.lenderId !== admin.lenderId) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Disbursement not found.',
          details: null
        });
      }

      if (disbursement.journalEntryId) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Disbursement already has a posted journal entry.',
          details: {
            disbursementId: disbursement.id,
            journalEntryId: disbursement.journalEntryId
          }
        });
      }

      if (
        disbursement.status !== DisbursementStatus.INITIATED &&
        disbursement.status !== DisbursementStatus.PROCESSING
      ) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Disbursement cannot be marked SUCCEEDED from current status.',
          details: {
            disbursementId: disbursement.id,
            status: disbursement.status
          }
        });
      }

      if (disbursement.loan.status !== LoanStatus.PENDING_DISBURSEMENT) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Loan is not in PENDING_DISBURSEMENT status.',
          details: {
            loanId: disbursement.loan.id,
            status: disbursement.loan.status
          }
        });
      }

      const journal = await this.ledgerService.postJournalEntry(
        {
          description: `Disbursement success for loan ${disbursement.loanId}`,
          reference: `DISBURSEMENT:${disbursement.id}`,
          lines: [
            {
              accountCode: '1100',
              entryType: 'DEBIT',
              amountKobo: disbursement.amountKobo,
              description: `Loans receivable for disbursement ${disbursement.id}`
            },
            {
              accountCode: '1000',
              entryType: 'CREDIT',
              amountKobo: disbursement.amountKobo,
              description: `Cash outflow for disbursement ${disbursement.id}`
            }
          ]
        },
        tx
      );

      const now = new Date();
      const updated = await tx.disbursement.update({
        where: { id: disbursement.id },
        data: {
          status: DisbursementStatus.SUCCEEDED,
          journalEntryId: journal.journalEntryId,
          succeededAt: now,
          failedAt: null,
          failureReason: null
        }
      });

      await tx.loan.update({
        where: { id: disbursement.loanId },
        data: {
          status: LoanStatus.ACTIVE
        }
      });

      return updated;
    });

    await this.auditService.write({
      event: 'DISBURSEMENT_SUCCEEDED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        disbursementId: result.id,
        loanId: result.loanId,
        journalEntryId: result.journalEntryId,
        amountKobo: result.amountKobo
      }
    });

    const borrowerPhone = await this.prisma.loan.findUnique({
      where: { id: result.loanId },
      include: {
        borrower: {
          select: { phone: true }
        }
      }
    });
    if (borrowerPhone?.lenderId === admin.lenderId && borrowerPhone.borrower.phone) {
      await this.notificationsService.sendDisbursementSucceeded(
        borrowerPhone.borrower.phone,
        result.loanId,
        result.amountKobo
      );
    }

    return this.toStatusResponse(result);
  }

  async markFailed(
    admin: AdminPrincipal,
    id: string,
    input: MarkFailedDisbursementDto
  ): Promise<DisbursementStatusResponseDto> {
    const disbursement = await this.getDisbursementOrThrow(id, admin.lenderId);
    if (
      disbursement.status !== DisbursementStatus.INITIATED &&
      disbursement.status !== DisbursementStatus.PROCESSING
    ) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Disbursement cannot be marked FAILED from current status.',
        details: {
          disbursementId: disbursement.id,
          status: disbursement.status
        }
      });
    }

    const updated = await this.prisma.disbursement.update({
      where: { id: disbursement.id },
      data: {
        status: DisbursementStatus.FAILED,
        failedAt: new Date(),
        failureReason: input.reason.trim()
      }
    });

    await this.auditService.write({
      event: 'DISBURSEMENT_FAILED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        disbursementId: updated.id,
        loanId: updated.loanId,
        reason: updated.failureReason
      }
    });

    return this.toStatusResponse(updated);
  }

  private async getDisbursementOrThrow(id: string, lenderId: string) {
    const disbursement = await this.prisma.disbursement.findUnique({
      where: { id }
    });

    if (!disbursement || disbursement.lenderId !== lenderId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Disbursement not found.',
        details: null
      });
    }

    return disbursement;
  }

  private toStatusResponse(input: {
    id: string;
    loanId: string;
    status: DisbursementStatus;
    journalEntryId: string | null;
  }): DisbursementStatusResponseDto {
    return {
      disbursementId: input.id,
      loanId: input.loanId,
      status: input.status,
      journalEntryId: input.journalEntryId
    };
  }
}
