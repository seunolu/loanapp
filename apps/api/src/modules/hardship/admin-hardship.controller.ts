import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { listAdminHardshipQuerySchema, transitionHardshipSchema } from './dto/hardship.dto';
import { HardshipService } from './hardship.service';

@ApiTags('Admin Hardship')
@ApiBearerAuth('bearer')
@Controller('admin/hardship')
@UseGuards(TenantAdminAuthGuard)
export class AdminHardshipController {
  constructor(private readonly hardshipService: HardshipService) {}

  @Get()
  @ApiOperation({ summary: 'List hardship requests for tenant admins' })
  async list(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Query() query: Record<string, string | undefined>) {
    const parsed = listAdminHardshipQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid hardship admin list query.',
        details: parsed.error.flatten()
      });
    }
    return this.hardshipService.listAdminRequests(principal, parsed.data);
  }

  @Post(':id/transition')
  @ApiOperation({ summary: 'Transition hardship request status' })
  async transition(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = transitionHardshipSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid hardship transition payload.',
        details: parsed.error.flatten()
      });
    }
    return this.hardshipService.transitionRequest(principal, id, parsed.data);
  }
}

