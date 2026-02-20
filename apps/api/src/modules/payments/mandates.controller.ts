import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { listMandatesQuerySchema, mandateAdminActionSchema, setupMandateSchema } from './dto/mandates.dto';
import { MandatesService } from './mandates.service';

@ApiTags('Mandates')
@ApiBearerAuth('bearer')
@Controller()
export class MandatesController {
  constructor(private readonly mandatesService: MandatesService) {}

  @Post('mandates/setup')
  @UseGuards(BorrowerAuthGuard)
  @ApiOperation({ summary: 'Setup borrower recurring debit mandate' })
  @ApiOkResponse()
  async setup(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = setupMandateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid mandate setup payload.',
        details: parsed.error.flatten()
      });
    }
    return this.mandatesService.setupBorrowerMandate(borrower, parsed.data, idempotencyKey);
  }

  @Get('mandates/me')
  @UseGuards(BorrowerAuthGuard)
  @ApiOperation({ summary: 'List borrower mandates' })
  @ApiOkResponse()
  async listMine(@CurrentBorrower() borrower: BorrowerPrincipal) {
    return this.mandatesService.listBorrowerMandates(borrower);
  }

  @Get('admin/mandates')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'List mandates for tenant admin' })
  @ApiOkResponse()
  async listAdmin(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = listMandatesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid mandate query.',
        details: parsed.error.flatten()
      });
    }
    return this.mandatesService.listAdminMandates(admin, parsed.data);
  }

  @Get('admin/mandates/:id')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'Get mandate detail' })
  @ApiOkResponse()
  async getAdminOne(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.mandatesService.getAdminMandate(admin, id);
  }

  @Post('admin/mandates/:id/pause')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'Pause mandate' })
  @ApiOkResponse()
  async pause(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = mandateAdminActionSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid pause payload.',
        details: parsed.error.flatten()
      });
    }
    return this.mandatesService.pauseMandate(admin, id, parsed.data.reason);
  }

  @Post('admin/mandates/:id/resume')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'Resume mandate' })
  @ApiOkResponse()
  async resume(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = mandateAdminActionSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid resume payload.',
        details: parsed.error.flatten()
      });
    }
    return this.mandatesService.resumeMandate(admin, id, parsed.data.reason);
  }

  @Post('admin/mandates/:id/cancel')
  @UseGuards(TenantAdminAuthGuard)
  @ApiOperation({ summary: 'Cancel mandate' })
  @ApiOkResponse()
  async cancel(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = mandateAdminActionSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid cancel payload.',
        details: parsed.error.flatten()
      });
    }
    return this.mandatesService.cancelMandate(admin, id, parsed.data.reason);
  }
}
