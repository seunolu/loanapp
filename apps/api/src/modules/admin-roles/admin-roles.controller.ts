import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesService } from './admin-roles.service';
import { AssignAdminRoleDto } from './dto/assign-admin-role.dto';
import { AdminRoleResponseDto } from './dto/admin-role-response.dto';

@ApiTags('AdminRoles')
@ApiBearerAuth('bearer')
@Controller('admin')
@UseGuards(AdminAuthGuard, PermissionsGuard)
export class AdminRolesController {
  constructor(private readonly service: AdminRolesService) {}

  @Get('roles')
  @RequirePermissions('ROLES_VIEW')
  @ApiOperation({ summary: 'List lender roles with permissions' })
  @ApiOkResponse({ type: [AdminRoleResponseDto] })
  async listRoles(@CurrentAdmin() admin: AdminPrincipal): Promise<AdminRoleResponseDto[]> {
    return this.service.listRoles(admin);
  }

  @Put('admin-users/:id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to admin user (owner or LENDER_SETTINGS_EDIT)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true }
      }
    }
  })
  async assignRole(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: AssignAdminRoleDto
  ): Promise<{ ok: true }> {
    return this.service.assignRole(admin, id, body.roleId);
  }
}
