import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { initInboundPaymentSchema } from './dto/init-inbound-payment.dto';
import { initOutboundPaymentSchema } from './dto/init-outbound-payment.dto';
import { listPaymentIntentsQuerySchema } from './dto/list-payment-intents-query.dto';
import { PaymentIntentsService } from './payment-intents.service';

@ApiTags('Admin Payments')
@ApiBearerAuth('bearer')
@Controller('admin/payments')
@UseGuards(TenantAdminAuthGuard)
export class AdminPaymentsController {
  constructor(private readonly service: PaymentIntentsService) {}

  @Post('inbound/init')
  @ApiOperation({ summary: 'Create and initialize inbound payment intent' })
  @ApiOkResponse()
  async initInbound(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Body() body: unknown
  ) {
    const parsed = initInboundPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid inbound payment payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.createInboundCollectionIntent(admin, parsed.data);
  }

  @Post('outbound/init')
  @ApiOperation({ summary: 'Create and initialize outbound payout intent' })
  @ApiOkResponse()
  async initOutbound(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Body() body: unknown
  ) {
    const parsed = initOutboundPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid outbound payment payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.createOutboundPayoutIntent(admin, parsed.data);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify payment intent with provider and settle when succeeded' })
  @ApiOkResponse()
  async verify(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.service.verifyIntent(admin, id);
  }

  @Get()
  @ApiOperation({ summary: 'List payment intents' })
  @ApiOkResponse()
  async list(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = listPaymentIntentsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid payment list query.',
        details: parsed.error.flatten()
      });
    }
    return this.service.listIntents(admin, parsed.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment intent with histories and events' })
  @ApiOkResponse()
  async getOne(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.service.getIntent(admin, id);
  }
}

