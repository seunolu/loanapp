import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import {
  createTenantAdminUserSchema,
  listTenantAdminUsersQuerySchema,
  updateTenantAdminUserSchema
} from './dto/tenant-admin-users.dto';
import { TenantAdminUsersService } from './tenant-admin-users.service';

@ApiTags('TenantAdminUsers')
@ApiBearerAuth('bearer')
@Controller('admin/tenant-admin-users')
@UseGuards(TenantAdminAuthGuard)
export class TenantAdminUsersController {
  constructor(private readonly service: TenantAdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List tenant admin users' })
  async list(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Query() query: Record<string, unknown>) {
    const parsed = listTenantAdminUsersQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid tenant admin users query.',
        details: parsed.error.flatten()
      });
    }
    return this.service.list(principal, parsed.data);
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant admin user' })
  async create(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = createTenantAdminUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid tenant admin user payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.create(principal, parsed.data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant admin user role or active status' })
  async update(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = updateTenantAdminUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid tenant admin user update payload.',
        details: parsed.error.flatten()
      });
    }
    return this.service.update(principal, id, parsed.data);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset tenant admin user password and return one-time temporary password' })
  async resetPassword(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Param('id') id: string) {
    return this.service.resetPassword(principal, id);
  }
}
