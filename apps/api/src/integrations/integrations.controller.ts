import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentDirection, PaymentIntentStatus, PaymentProvider } from '@prisma/client';
import { z } from 'zod';
import { CurrentTenantAdmin } from '../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../modules/admin-auth/guards/tenant-admin-auth.guard';
import { IntegrationsPaymentsService } from './payments.service';

const initRepaymentSchema = z.object({
  loanId: z.string().trim().min(1),
  amountKobo: z.coerce.number().int().positive()
});

const initDisbursementSchema = z.object({
  loanId: z.string().trim().min(1),
  amountKobo: z.coerce.number().int().positive(),
  bankAccount: z.string().trim().min(8),
  bankCode: z.string().trim().min(1),
  beneficiaryName: z.string().trim().min(1).optional()
});

const listTransactionsSchema = z.object({
  status: z.nativeEnum(PaymentIntentStatus).optional(),
  direction: z.nativeEnum(PaymentDirection).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

const listWebhookSchema = z.object({
  provider: z.nativeEnum(PaymentProvider).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

@ApiTags('Integrations')
@Controller()
export class IntegrationsController {
  constructor(private readonly integrationsPaymentsService: IntegrationsPaymentsService) {}

  @Post('admin/integrations/payments/repayments/init')
  @ApiBearerAuth('bearer')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'Initialize inbound repayment request through payment provider' })
  @ApiOkResponse()
  async initRepayment(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Body() body: unknown
  ) {
    const parsed = initRepaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid repayment init payload.',
        details: parsed.error.flatten()
      });
    }
    return this.integrationsPaymentsService.initRepayment(principal, parsed.data);
  }

  @Post('admin/integrations/payments/disbursements/init')
  @ApiBearerAuth('bearer')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'Initialize outbound disbursement transfer through payment provider' })
  @ApiOkResponse()
  async initDisbursement(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Body() body: unknown
  ) {
    const parsed = initDisbursementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid disbursement init payload.',
        details: parsed.error.flatten()
      });
    }
    return this.integrationsPaymentsService.initDisbursement(principal, parsed.data);
  }

  @Get('admin/integrations/payments/transactions')
  @ApiBearerAuth('bearer')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'List provider transactions for tenant' })
  @ApiOkResponse()
  async listTransactions(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = listTransactionsSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid transactions query.',
        details: parsed.error.flatten()
      });
    }
    return this.integrationsPaymentsService.listTransactions(principal, parsed.data);
  }

  @Get('admin/integrations/webhooks')
  @ApiBearerAuth('bearer')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'List webhook events for tenant' })
  @ApiOkResponse()
  async listWebhooks(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = listWebhookSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid webhooks query.',
        details: parsed.error.flatten()
      });
    }
    return this.integrationsPaymentsService.listWebhooks(principal, parsed.data);
  }

}
