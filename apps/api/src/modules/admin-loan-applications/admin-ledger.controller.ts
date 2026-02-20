import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminConfirmationGuard } from '../../common/admin-confirmation/admin-confirmation.guard';
import { RequireAdminConfirmation } from '../../common/admin-confirmation/admin-confirmation.decorator';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';
import { AdminLedgerService } from './admin-ledger.service';
import { createLedgerAdjustmentSchema } from './dto/create-ledger-adjustment.dto';
import { z } from 'zod';
import { parsePagination } from '../../common/http/pagination';

@ApiTags('Admin Ledger')
@ApiBearerAuth('bearer')
@Controller('admin/ledger')
@UseGuards(TenantAdminAuthGuard)
export class AdminLedgerController {
  constructor(
    private readonly adminLoanApplicationsService: AdminLoanApplicationsService,
    private readonly adminLedgerService: AdminLedgerService
  ) {}

  @Post('adjustments')
  @RateLimit('LOAN_MUTATION')
  @UseGuards(AdminConfirmationGuard)
  @RequireAdminConfirmation({ purpose: 'LEDGER_ADJUSTMENT' })
  @ApiOperation({ summary: 'Create a manual balanced ledger adjustment journal' })
  @ApiOkResponse()
  createLedgerAdjustment(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Body() body: unknown
  ) {
    const parsed = createLedgerAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid ledger adjustment payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.createLedgerAdjustment(admin, parsed.data);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List tenant ledger accounts with balances' })
  @ApiOkResponse()
  listAccounts(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Query('asOf') asOf?: string) {
    return this.adminLedgerService.listAccounts(admin, asOf);
  }

  @Get('accounts/:code/balance')
  @ApiOperation({ summary: 'Get balance for one account code' })
  @ApiOkResponse()
  accountBalance(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('code') code: string,
    @Query('asOf') asOf?: string
  ) {
    return this.adminLedgerService.getAccountBalance(admin, code, asOf);
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get tenant trial balance' })
  @ApiOkResponse()
  trialBalance(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Query('asOf') asOf?: string) {
    return this.adminLedgerService.getTrialBalance(admin, asOf);
  }

  @Get('entries')
  @ApiOperation({ summary: 'List tenant ledger entries' })
  @ApiOkResponse()
  listEntries(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const pagination = parsePagination(query);
    return this.adminLedgerService.listEntries(admin, {
      from: typeof query.from === 'string' ? query.from : undefined,
      to: typeof query.to === 'string' ? query.to : undefined,
      referenceType: typeof query.referenceType === 'string' ? query.referenceType : undefined,
      referenceId: typeof query.referenceId === 'string' ? query.referenceId : undefined,
      limit: pagination.take,
      offset: pagination.skip
    });
  }

  @Patch('entries/:id/reverse')
  @RateLimit('LOAN_MUTATION')
  @UseGuards(AdminConfirmationGuard)
  @RequireAdminConfirmation({ purpose: 'LEDGER_REVERSAL', resourceParam: 'id' })
  @ApiOperation({ summary: 'Reverse an immutable ledger entry' })
  @ApiOkResponse()
  reverseEntry(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const schema = z.object({ reason: z.string().trim().min(1).max(500) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reversal payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLedgerService.reverseEntry(admin, { entryId: id, reason: parsed.data.reason });
  }
}
