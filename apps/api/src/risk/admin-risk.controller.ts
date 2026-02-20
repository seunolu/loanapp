import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentTenantAdmin } from '../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../modules/admin-auth/guards/tenant-admin-auth.guard';
import { RiskService } from './risk.service';

const createPolicySchema = z.object({
  name: z.string().trim().min(1).max(100),
  configJson: z.unknown()
});

@ApiTags('Admin Risk')
@ApiBearerAuth('bearer')
@Controller('admin/risk')
@UseGuards(TenantAdminAuthGuard)
export class AdminRiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('policies')
  @ApiOperation({ summary: 'List tenant risk policies' })
  @ApiOkResponse()
  listPolicies(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    return this.riskService.listPolicies(admin.tenantId);
  }

  @Post('policies')
  @ApiOperation({ summary: 'Create a new tenant risk policy version' })
  @ApiOkResponse()
  createPolicy(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = createPolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid policy payload.',
        details: parsed.error.flatten()
      });
    }
    return this.riskService.createPolicy({
      tenantId: admin.tenantId,
      role: admin.role,
      name: parsed.data.name,
      configJson: parsed.data.configJson,
      createdBy: admin.adminId
    });
  }

  @Post('policies/:id/activate')
  @ApiOperation({ summary: 'Activate a risk policy version' })
  @ApiOkResponse()
  activatePolicy(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.riskService.activatePolicy({
      tenantId: admin.tenantId,
      role: admin.role,
      policyId: id,
      activatedBy: admin.adminId
    });
  }
}

