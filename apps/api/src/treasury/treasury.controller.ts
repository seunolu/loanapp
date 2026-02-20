import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CapitalPoolStatus, CapitalPoolType } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentTenantAdmin } from '../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../modules/admin-auth/guards/tenant-admin-auth.guard';
import { TreasuryService } from './treasury.service';

const createPoolSchema = z.object({
  name: z.string().min(2),
  type: z.nativeEnum(CapitalPoolType),
  currency: z.string().min(3).max(3).optional(),
  externalRef: z.string().trim().min(1).optional().nullable(),
  rules: z.record(z.unknown()).optional()
});

const updatePoolSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.nativeEnum(CapitalPoolStatus).optional(),
  externalRef: z.string().trim().min(1).optional().nullable(),
  rules: z.record(z.unknown()).optional()
});

@ApiTags('Admin Treasury')
@ApiBearerAuth('bearer')
@Controller('admin/treasury')
@UseGuards(TenantAdminAuthGuard)
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Post('pools')
  @ApiOperation({ summary: 'Create tenant capital pool' })
  async createPool(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Body() body: unknown) {
    this.treasuryService.assertCanManage(admin.role);
    const parsed = createPoolSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid capital pool payload.',
        details: parsed.error.flatten()
      });
    }
    return this.treasuryService.createPool({
      tenantId: admin.tenantId,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency,
      externalRef: parsed.data.externalRef ?? null,
      rulesJson: parsed.data.rules
    });
  }

  @Get('pools')
  @ApiOperation({ summary: 'List tenant capital pools' })
  async listPools(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    this.treasuryService.assertCanRead(admin.role);
    return this.treasuryService.listPools(admin.tenantId);
  }

  @Get('pools/:id')
  @ApiOperation({ summary: 'Get capital pool details' })
  async getPool(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    this.treasuryService.assertCanRead(admin.role);
    return this.treasuryService.getPool(admin.tenantId, id);
  }

  @Patch('pools/:id')
  @ApiOperation({ summary: 'Update capital pool metadata, status, or rules' })
  async updatePool(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    this.treasuryService.assertCanManage(admin.role);
    const parsed = updatePoolSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid capital pool patch payload.',
        details: parsed.error.flatten()
      });
    }
    return this.treasuryService.updatePool(admin.tenantId, id, {
      name: parsed.data.name,
      status: parsed.data.status,
      externalRef: parsed.data.externalRef ?? undefined,
      rulesJson: parsed.data.rules
    });
  }

  @Get('pools/:id/summary')
  @ApiOperation({ summary: 'Get capital pool balance summary' })
  async getPoolSummary(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    this.treasuryService.assertCanRead(admin.role);
    return this.treasuryService.getPoolSummary(admin.tenantId, id);
  }

  @Get('pools/:id/performance')
  @ApiOperation({ summary: 'Get capital pool performance window' })
  async getPoolPerformance(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    this.treasuryService.assertCanRead(admin.role);
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.treasuryService.getPoolPerformance(admin.tenantId, id, fromDate, toDate);
  }

  @Get('pools/:id/allocations')
  @ApiOperation({ summary: 'List recent capital allocations for pool' })
  async listPoolAllocations(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Query('take') take?: string
  ) {
    this.treasuryService.assertCanRead(admin.role);
    const parsedTake = take ? Number.parseInt(take, 10) : 20;
    return this.treasuryService.listPoolAllocations(admin.tenantId, id, Number.isFinite(parsedTake) ? parsedTake : 20);
  }
}

