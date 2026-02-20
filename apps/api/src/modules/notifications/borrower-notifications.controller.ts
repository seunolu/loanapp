import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { NotificationsService } from '../../common/notifications/notifications.service';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { listNotificationsQuerySchema } from './dto/list-notifications-query.dto';

@ApiTags('Borrower Notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
@UseGuards(BorrowerAuthGuard)
export class BorrowerNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current borrower' })
  async list(@CurrentBorrower() borrower: BorrowerPrincipal, @Query() query: Record<string, string | undefined>) {
    const parsed = listNotificationsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid notifications query.',
        details: parsed.error.flatten()
      });
    }
    const result = await this.notificationsService.listNotifications(
      { type: 'BORROWER', principal: borrower },
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
  @ApiOperation({ summary: 'Mark borrower notification as read' })
  async markAsRead(@CurrentBorrower() borrower: BorrowerPrincipal, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, { type: 'BORROWER', principal: borrower });
  }
}

