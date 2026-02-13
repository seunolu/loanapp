import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { LoanStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { PrismaService } from '../../common/database/prisma.service';
import type { InitializePaymentDto } from './dto/initialize-payment.dto';
import type { InitializePaymentResponseDto } from './dto/initialize-payment-response.dto';
import { PaystackStubProvider } from './providers/paystack-stub.provider';

@Injectable({ scope: Scope.REQUEST })
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly paystackProvider: PaystackStubProvider
  ) {}

  async initialize(
    principal: BorrowerPrincipal,
    input: InitializePaymentDto
  ): Promise<InitializePaymentResponseDto> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: input.loanId.trim() },
      select: {
        id: true,
        lenderId: true,
        borrowerId: true,
        status: true
      }
    });

    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan not found.',
        details: null
      });
    }

    if (loan.borrowerId !== principal.borrowerId || loan.lenderId !== principal.lenderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this loan.',
        details: null
      });
    }

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Loan is not payable in current status.',
        details: {
          loanId: loan.id,
          status: loan.status
        }
      });
    }

    const reference = `PAY-${randomUUID()}`;

    const created = await this.prisma.payment.create({
      data: {
        reference,
        lenderId: principal.lenderId,
        borrowerId: principal.borrowerId,
        loanId: loan.id,
        amountKobo: input.amountKobo,
        provider: PaymentProvider.PAYSTACK,
        status: PaymentStatus.INITIATED
      }
    });

    const providerInit = await this.paystackProvider.initialize({
      amountKobo: input.amountKobo,
      reference,
      metadata: {
        paymentId: created.id,
        loanId: loan.id,
        borrowerId: principal.borrowerId
      }
    });

    const updated = await this.prisma.payment.update({
      where: { id: created.id },
      data: {
        status: PaymentStatus.PENDING,
        providerRef: providerInit.providerRef,
        authorizationUrl: providerInit.authorizationUrl
      }
    });

    await this.auditService.write({
      event: 'PAYMENT_INITIALIZED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        entityType: 'PAYMENT',
        entityId: updated.id,
        loanId: updated.loanId,
        provider: updated.provider,
        providerRef: updated.providerRef,
        amountKobo: updated.amountKobo
      }
    });

    return {
      paymentId: updated.id,
      provider: 'PAYSTACK',
      authorizationUrl: updated.authorizationUrl ?? providerInit.authorizationUrl,
      reference: updated.reference
    };
  }
}
