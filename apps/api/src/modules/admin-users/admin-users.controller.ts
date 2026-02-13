import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { AdminUserItemDto, AdminUserListResponseDto, CreateAdminUserResponseDto } from './dto/admin-user-response.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto';

@ApiTags('AdminUsers')
@ApiBearerAuth('bearer')
@Controller('admin/admin-users')
@UseGuards(AdminAuthGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Post()
  @RequirePermissions('ADMIN_USERS_MANAGE')
  @ApiOperation({ summary: 'Create admin staff, assign role, and issue invite token' })
  @ApiOkResponse({ type: CreateAdminUserResponseDto })
  async create(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() body: CreateAdminUserDto
  ): Promise<CreateAdminUserResponseDto> {
    return this.service.createAdminUser(admin, body);
  }

  @Get()
  @RequirePermissions('ADMIN_USERS_VIEW')
  @ApiOperation({ summary: 'List/search admin users with cursor pagination' })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  async list(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: ListAdminUsersQueryDto
  ): Promise<AdminUserListResponseDto> {
    return this.service.listAdminUsers(admin, query);
  }

  @Get(':id')
  @RequirePermissions('ADMIN_USERS_VIEW')
  @ApiOperation({ summary: 'Get admin user details' })
  @ApiOkResponse({ type: AdminUserItemDto })
  async getById(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string): Promise<AdminUserItemDto> {
    return this.service.getAdminUser(admin, id);
  }

  @Patch(':id/status')
  @RequirePermissions('ADMIN_USERS_MANAGE')
  @ApiOperation({ summary: 'Activate or suspend admin user account' })
  @ApiOkResponse({ type: AdminUserItemDto })
  async updateStatus(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: UpdateAdminUserStatusDto
  ): Promise<AdminUserItemDto> {
    return this.service.updateStatus(admin, id, body);
  }

  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ADMIN_USERS_MANAGE')
  @ApiOperation({ summary: 'Issue a new invite token for admin user password setup' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        inviteToken: { type: 'string' },
        inviteExpiresAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async resetInvite(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string
  ): Promise<{ inviteToken: string; inviteExpiresAt: string }> {
    return this.service.resetInvite(admin, id);
  }
}
