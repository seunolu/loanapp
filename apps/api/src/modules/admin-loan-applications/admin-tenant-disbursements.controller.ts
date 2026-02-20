import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { PaymentIntentsService } from '../payments/payment-intents.service';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';
import { ListDisbursementsQueryDto } from './dto/list-disbursements-query.dto';
import { retryDisbursementSchema } from './dto/retry-disbursement.dto';
import { reverseDisbursementSchema } from './dto/reverse-disbursement.dto';

const createRecipientSchema = z.object({
  borrowerId: z.string().trim().min(1),
  bankCode: z.string().trim().min(1),
  accountNumber: z.string().trim().min(8),
  accountName: z.string().trim().min(1).optional()
});

const initiateGatewayDisbursementSchema = z.object({
  loanId: z.string().trim().min(1),
  amount: z.coerce.number().positive().optional()
});

const verifyGatewayDisbursementSchema = z.object({
  reference: z.string().trim().min(1)
});

@ApiTags('Admin Disbursements')
@ApiBearerAuth('bearer')
@Controller('admin/disbursements')
@UseGuards(TenantAdminAuthGuard)
export class AdminTenantDisbursementsController {
  constructor(
    private readonly adminLoanApplicationsService: AdminLoanApplicationsService,
    private readonly paymentIntentsService: PaymentIntentsService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List tenant disbursements' })
  @ApiOkResponse()
  list(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: ListDisbursementsQueryDto
  ) {
    return this.adminLoanApplicationsService.listDisbursements(admin, query as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant disbursement details with history' })
  @ApiOkResponse()
  findOne(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.getDisbursement(admin, id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed disbursement' })
  @ApiOkResponse()
  retry(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = retryDisbursementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid retry payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.retryDisbursement(admin, id, parsed.data);
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse successful disbursement' })
  @ApiOkResponse()
  reverse(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = reverseDisbursementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reverse payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.reverseDisbursement(admin, id, parsed.data);
  }

  @Post('recipient')
  @ApiOperation({ summary: 'Create payout recipient profile for borrower' })
  @ApiOkResponse()
  async createRecipient(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = createRecipientSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid recipient payload.',
        details: parsed.error.flatten()
      });
    }
    return this.paymentIntentsService.createTransferRecipient(admin, parsed.data);
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate provider-backed disbursement transfer' })
  @ApiOkResponse()
  async initiate(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = initiateGatewayDisbursementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid disbursement initiate payload.',
        details: parsed.error.flatten()
      });
    }
    return this.paymentIntentsService.initiateAdminDisbursement(admin, parsed.data);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify provider-backed disbursement transfer by reference' })
  @ApiOkResponse()
  async verify(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = verifyGatewayDisbursementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid disbursement verify payload.',
        details: parsed.error.flatten()
      });
    }
    return this.paymentIntentsService.verifyAdminDisbursement(admin, parsed.data.reference);
  }
}
