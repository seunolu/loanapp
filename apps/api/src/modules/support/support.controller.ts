import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import {
  approveSupportActionSchema,
  createSupportActionSchema,
  createSupportCaseSchema,
  createSupportNoteSchema,
  listSupportCasesQuerySchema,
  rejectSupportActionSchema
} from './dto/support.dto';
import { SupportService } from './support.service';

@ApiTags('Admin Support')
@ApiBearerAuth('bearer')
@Controller('admin/support')
@UseGuards(TenantAdminAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('cases')
  @ApiOperation({ summary: 'Create support case' })
  async createCase(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = createSupportCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid support case payload.',
        details: parsed.error.flatten()
      });
    }
    return this.supportService.createCase(principal, parsed.data);
  }

  @Get('cases')
  @ApiOperation({ summary: 'List support cases' })
  async listCases(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Query() query: Record<string, unknown>) {
    const parsed = listSupportCasesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid support case query.',
        details: parsed.error.flatten()
      });
    }
    return this.supportService.listCases(principal, parsed.data);
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Get support case details' })
  async getCase(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Param('id') id: string) {
    return this.supportService.getCase(principal, id);
  }

  @Post('cases/:id/notes')
  @ApiOperation({ summary: 'Add support note' })
  async addNote(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = createSupportNoteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid support note payload.',
        details: parsed.error.flatten()
      });
    }
    return this.supportService.addNote(principal, id, parsed.data);
  }

  @Post('cases/:id/actions')
  @ApiOperation({ summary: 'Create support action request' })
  async createAction(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = createSupportActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid support action payload.',
        details: parsed.error.flatten()
      });
    }
    return this.supportService.createAction(principal, id, parsed.data);
  }

  @Post('actions/:id/approve')
  @ApiOperation({ summary: 'Approve support action' })
  async approveAction(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = approveSupportActionSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid support action approval payload.',
        details: parsed.error.flatten()
      });
    }
    return this.supportService.approveAction(principal, id, parsed.data);
  }

  @Post('actions/:id/reject')
  @ApiOperation({ summary: 'Reject support action' })
  async rejectAction(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = rejectSupportActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid support action rejection payload.',
        details: parsed.error.flatten()
      });
    }
    return this.supportService.rejectAction(principal, id, parsed.data);
  }

  @Post('actions/:id/execute')
  @ApiOperation({ summary: 'Execute approved support action' })
  async executeAction(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Param('id') id: string) {
    return this.supportService.executeAction(principal, id);
  }

  @Post('cases/:id/close')
  @ApiOperation({ summary: 'Close support case' })
  async closeCase(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Param('id') id: string) {
    return this.supportService.closeCase(principal, id);
  }
}
