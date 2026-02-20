import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { NotificationsService } from '../../common/notifications/notifications.service';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { listNotificationsQuerySchema } from './dto/list-notifications-query.dto';

@ApiTags('Admin Notifications')
@ApiBearerAuth('bearer')
@Controller('admin/notifications')
@UseGuards(TenantAdminAuthGuard)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current tenant admin user' })
  async list(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Query() query: Record<string, string | undefined>) {
    const parsed = listNotificationsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid notifications query.',
        details: parsed.error.flatten()
      });
    }
    const result = await this.notificationsService.listNotifications(
      { type: 'ADMIN', principal: admin },
      parsed.data
    );
    return {
      items: result.items,
      total: result.total,
      limit: parsed.data.limit ?? 20,
      offset: parsed.data.offset ?? 0
    };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark admin notification as read' })
  async markAsRead(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, { type: 'ADMIN', principal: admin });
  }
}

