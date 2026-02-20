import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { createReconciliationRunSchema } from './dto/create-reconciliation-run.dto';
import { createSettlementBatchSchema } from './dto/create-settlement-batch.dto';
import { listReconciliationIssuesQuerySchema } from './dto/list-reconciliation-issues-query.dto';
import { listReconciliationRecordsQuerySchema } from './dto/list-reconciliation-records-query.dto';
import { listReconciliationRunsQuerySchema } from './dto/list-reconciliation-runs-query.dto';
import { listSettlementBatchesQuerySchema } from './dto/list-settlement-batches-query.dto';
import { resolveReconciliationRecordSchema } from './dto/resolve-reconciliation-record.dto';
import { runReconciliationJobSchema } from './dto/run-reconciliation-job.dto';
import { updateReconciliationIssueSchema } from './dto/update-reconciliation-issue.dto';
import { ReconciliationService } from './reconciliation.service';

@ApiTags('Admin Reconciliation')
@ApiBearerAuth('bearer')
@Controller('admin/reconciliation')
@UseGuards(TenantAdminAuthGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  private assertSuperAdmin(admin: TenantAdminPrincipal): void {
    if (admin.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'SUPER_ADMIN role is required for this reconciliation operation.',
        details: null
      });
    }
  }

  @Post('runs')
  @ApiOperation({ summary: 'Run reconciliation job for payments/disbursements/settlement' })
  @ApiOkResponse()
  async run(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Body() body: unknown) {
    this.assertSuperAdmin(admin);
    const parsed = createReconciliationRunSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reconciliation run payload.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.run(admin, parsed.data);
  }

  @Get('runs')
  @ApiOperation({ summary: 'List reconciliation runs' })
  @ApiOkResponse()
  async listRuns(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Query() query: Record<string, unknown>) {
    this.assertSuperAdmin(admin);
    const parsed = listReconciliationRunsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reconciliation runs query.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.listRuns(admin, parsed.data);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get reconciliation run details including issues' })
  @ApiOkResponse()
  async getRun(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    this.assertSuperAdmin(admin);
    return this.reconciliationService.getRun(admin, id);
  }

  @Post('run-now')
  @ApiOperation({ summary: 'Run repayment and disbursement reconciliation immediately (SUPER_ADMIN only)' })
  @ApiOkResponse()
  async runNow(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    this.assertSuperAdmin(admin);
    const repayment = await this.reconciliationService.run(admin, { type: 'PAYMENT', days: 1 });
    const disbursement = await this.reconciliationService.run(admin, { type: 'DISBURSEMENT', days: 1 });
    return { repayment, disbursement };
  }

  @Get('issues')
  @ApiOperation({ summary: 'List reconciliation issues' })
  @ApiOkResponse()
  async listIssues(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Query() query: Record<string, unknown>) {
    const parsed = listReconciliationIssuesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reconciliation issues query.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.listIssues(admin, parsed.data);
  }

  @Patch('issues/:id')
  @ApiOperation({ summary: 'Acknowledge/resolve/escalate reconciliation issue' })
  @ApiOkResponse()
  async updateIssue(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = updateReconciliationIssueSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reconciliation issue update payload.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.updateIssue(admin, id, parsed.data);
  }

  @Patch('mismatch/:id/resolve')
  @ApiOperation({ summary: 'Resolve reconciliation mismatch (SUPER_ADMIN only)' })
  @ApiOkResponse()
  async resolveMismatch(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    this.assertSuperAdmin(admin);
    const payload = (body ?? {}) as { resolutionNote?: unknown };
    const note = typeof payload.resolutionNote === 'string' ? payload.resolutionNote : undefined;
    return this.reconciliationService.updateIssue(admin, id, { status: 'RESOLVED', note });
  }

  @Get()
  @ApiOperation({ summary: 'List reconciliation records (hardened workflow)' })
  @ApiOkResponse()
  async listRecords(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Query() query: Record<string, unknown>) {
    const parsed = listReconciliationRecordsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reconciliation records query.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.listRecords(admin, parsed.data);
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get reconciliation record details including resolution history' })
  @ApiOkResponse()
  async getRecord(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.reconciliationService.getRecord(admin, id);
  }

  @Post('records/:id/resolve')
  @ApiOperation({ summary: 'Resolve reconciliation record with workflow state transition' })
  @ApiOkResponse()
  async resolveRecord(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = resolveReconciliationRecordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reconciliation resolve payload.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.resolveRecord(admin, id, parsed.data);
  }

  @Post('jobs/run')
  @ApiOperation({ summary: 'Run hardened reconciliation job for provider/date range' })
  @ApiOkResponse()
  async runJob(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = runReconciliationJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reconciliation job payload.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.runJob(admin, parsed.data);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List reconciliation job runs' })
  @ApiOkResponse()
  async listJobRuns(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    return this.reconciliationService.listJobRuns(admin, query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get one reconciliation job run' })
  @ApiOkResponse()
  async getJobRun(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.reconciliationService.getJobRun(admin, id);
  }

  @Post('settlement-batches')
  @ApiOperation({ summary: 'Create/open a settlement batch' })
  @ApiOkResponse()
  async createSettlementBatch(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = createSettlementBatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid settlement batch payload.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.createSettlementBatch(admin, parsed.data);
  }

  @Get('settlement-batches')
  @ApiOperation({ summary: 'List settlement batches' })
  @ApiOkResponse()
  async listSettlementBatches(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = listSettlementBatchesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid settlement batches query.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.listSettlementBatches(admin, parsed.data);
  }

  @Get('settlement-batches/:id')
  @ApiOperation({ summary: 'Get one settlement batch with summary' })
  @ApiOkResponse()
  async getSettlementBatch(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.reconciliationService.getSettlementBatch(admin, id);
  }

  @Post('settlement-batches/:id/close')
  @ApiOperation({ summary: 'Close settlement batch (SUPER_ADMIN only)' })
  @ApiOkResponse()
  async closeSettlementBatch(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.reconciliationService.closeSettlementBatch(admin, id);
  }

  // Compatibility aliases requested for /admin/reconciliation/:id and /:id/resolve
  @Get(':id')
  @ApiOperation({ summary: 'Get reconciliation record details (alias)' })
  @ApiOkResponse()
  async getRecordAlias(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.reconciliationService.getRecord(admin, id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve reconciliation record (alias)' })
  @ApiOkResponse()
  async resolveRecordAlias(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = resolveReconciliationRecordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid reconciliation resolve payload.',
        details: parsed.error.flatten()
      });
    }
    return this.reconciliationService.resolveRecord(admin, id, parsed.data);
  }
}
