import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminCollectionsService } from './admin-collections.service';
import { addCollectionsCaseActionSchema } from './dto/add-collections-case-action.dto';
import { assignCollectionsCaseSchema } from './dto/assign-collections-case.dto';
import { closeCollectionsCaseSchema } from './dto/close-collections-case.dto';
import { createCollectionActivitySchema } from './dto/create-collection-activity.dto';
import { listCollectionsCasesQuerySchema } from './dto/list-collections-cases-query.dto';
import { ListCollectionsQueueQueryDto } from './dto/list-collections-queue-query.dto';
import { pauseLoanPenaltySchema } from './dto/pause-loan-penalty.dto';
import { runCollectionsScanSchema } from './dto/run-collections-scan.dto';
import { setPromiseToPaySchema } from './dto/set-promise-to-pay.dto';
import { waiveLoanPenaltySchema } from './dto/waive-loan-penalty.dto';
import { writeOffCollectionsCaseSchema } from './dto/write-off-collections-case.dto';

@ApiTags('Admin Collections')
@ApiBearerAuth('bearer')
@Controller('admin/collections')
@UseGuards(TenantAdminAuthGuard)
export class AdminCollectionsController {
  constructor(private readonly service: AdminCollectionsService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run idempotent collections arrears scan for tenant' })
  @ApiOkResponse()
  runScan(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Body() body: unknown
  ) {
    const parsed = runCollectionsScanSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid run payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.runCollectionsScan(admin, parsed.data);
  }

  @Get('cases')
  @ApiOperation({ summary: 'List collections cases' })
  @ApiOkResponse()
  listCases(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = listCollectionsCasesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid list cases query.',
        details: parsed.error.flatten()
      });
    }
    return this.service.listCases(admin, parsed.data);
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Get collections case details' })
  @ApiOkResponse()
  getCase(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.service.getCase(admin, id);
  }

  @Post('cases/:id/assign')
  @ApiOperation({ summary: 'Assign collections case to admin user' })
  @ApiOkResponse()
  assignCase(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = assignCollectionsCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid assign payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.assignCase(admin, id, parsed.data);
  }

  @Post('cases/:id/action')
  @ApiOperation({ summary: 'Add collections case action' })
  @ApiOkResponse()
  addCaseAction(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = addCollectionsCaseActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid action payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.addCaseAction(admin, id, parsed.data);
  }

  @Post('cases/:id/promise-to-pay')
  @ApiOperation({ summary: 'Set promise-to-pay for case' })
  @ApiOkResponse()
  setPromiseToPay(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = setPromiseToPaySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid promise-to-pay payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.setPromiseToPay(admin, id, parsed.data);
  }

  @Post('cases/:id/close')
  @ApiOperation({ summary: 'Close collections case' })
  @ApiOkResponse()
  closeCase(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = closeCollectionsCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid close payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.closeCase(admin, id, parsed.data);
  }

  @Post('cases/:id/write-off')
  @ApiOperation({ summary: 'Write off collections case' })
  @ApiOkResponse()
  writeOffCase(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = writeOffCollectionsCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid write-off payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.writeOffCase(admin, id, parsed.data);
  }

  @Post('/loans/:loanAccountId/penalty/pause')
  @ApiOperation({ summary: 'Pause/resume penalties for loan account' })
  @ApiOkResponse()
  pauseLoanPenalty(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('loanAccountId') loanAccountId: string,
    @Body() body: unknown
  ) {
    const parsed = pauseLoanPenaltySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid penalty pause payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.pauseLoanPenalty(admin, loanAccountId, parsed.data);
  }

  @Post('/loans/:loanAccountId/penalty/waive')
  @ApiOperation({ summary: 'Waive part of penalties for loan account' })
  @ApiOkResponse()
  waiveLoanPenalty(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('loanAccountId') loanAccountId: string,
    @Body() body: unknown
  ) {
    const parsed = waiveLoanPenaltySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid penalty waiver payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.waiveLoanPenalty(admin, loanAccountId, parsed.data);
  }

  // Backward-compatible endpoints
  @Get('queue')
  @ApiOperation({ summary: 'List delinquent loans by bucket' })
  @ApiOkResponse()
  listQueue(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: ListCollectionsQueueQueryDto
  ) {
    return this.service.listQueue(admin, query);
  }

  @Post(':loanId/activity')
  @ApiOperation({ summary: 'Create collection activity' })
  @ApiOkResponse()
  addActivity(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('loanId') loanId: string,
    @Body() body: unknown
  ) {
    const parsed = createCollectionActivitySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid collection activity payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.addActivity(admin, loanId, parsed.data);
  }

  @Post(':loanId/write-off')
  @ApiOperation({ summary: 'Write off a delinquent loan' })
  @ApiOkResponse()
  writeOff(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('loanId') loanId: string) {
    return this.service.writeOff(admin, loanId);
  }

  @Post(':loanId/settle')
  @ApiOperation({ summary: 'Settle a loan' })
  @ApiOkResponse()
  settle(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('loanId') loanId: string) {
    return this.service.settle(admin, loanId);
  }
}

