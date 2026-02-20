import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { z } from 'zod';
import { AdminConfirmationService } from '../../common/admin-confirmation/admin-confirmation.service';

const createConfirmationSchema = z.object({
  purpose: z.string().trim().min(1).max(80),
  resourceId: z.string().trim().min(1).max(120).optional()
});

@ApiTags('Admin Confirmations')
@ApiBearerAuth('bearer')
@Controller('admin/confirmations')
@UseGuards(TenantAdminAuthGuard)
export class AdminConfirmationsController {
  constructor(private readonly adminConfirmationService: AdminConfirmationService) {}

  @Post()
  @ApiOperation({ summary: 'Issue short-lived one-time token for sensitive admin action confirmation' })
  @ApiOkResponse()
  async create(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Body() body: unknown
  ): Promise<{ token: string; expiresAt: string }> {
    const parsed = createConfirmationSchema.parse(body);
    return this.adminConfirmationService.issueToken({
      purpose: parsed.purpose,
      resourceId: parsed.resourceId ?? null,
      tenantId: admin.tenantId,
      adminId: admin.adminId,
      adminRole: admin.role
    });
  }
}

