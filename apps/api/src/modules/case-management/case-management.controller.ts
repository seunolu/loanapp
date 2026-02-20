import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { CaseManagementService } from './case-management.service';
import {
  assignCaseSchema,
  createCaseMessageSchema,
  createCaseSchema,
  listCasesQuerySchema,
  transitionCaseSchema
} from './dto/case-management.dto';

@ApiTags('Admin Cases')
@ApiBearerAuth('bearer')
@Controller('admin/cases')
@UseGuards(TenantAdminAuthGuard)
export class CaseManagementController {
  constructor(private readonly caseService: CaseManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Create case' })
  async createCase(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Body() body: unknown) {
    const parsed = createCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid create case payload.',
        details: parsed.error.flatten()
      });
    }
    return this.caseService.createCase(principal, parsed.data);
  }

  @Get()
  @ApiOperation({ summary: 'List cases with filters' })
  async listCases(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: Record<string, string | undefined>
  ) {
    const parsed = listCasesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid list cases query.',
        details: parsed.error.flatten()
      });
    }
    return this.caseService.listCases(principal, parsed.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case details with messages and history' })
  async getCase(@CurrentTenantAdmin() principal: TenantAdminPrincipal, @Param('id') id: string) {
    return this.caseService.getCase(principal, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add case message' })
  async addMessage(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = createCaseMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid create case message payload.',
        details: parsed.error.flatten()
      });
    }
    return this.caseService.addMessage(principal, id, parsed.data);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign case to an admin user or self when omitted' })
  async assignCase(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = assignCaseSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid assign case payload.',
        details: parsed.error.flatten()
      });
    }
    return this.caseService.assignCase(principal, id, parsed.data);
  }

  @Post(':id/transition')
  @ApiOperation({ summary: 'Transition case status' })
  async transitionCase(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = transitionCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid case transition payload.',
        details: parsed.error.flatten()
      });
    }
    return this.caseService.transitionCase(principal, id, parsed.data);
  }
}

