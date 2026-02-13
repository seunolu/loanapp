import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminUnderwritingService } from './admin-underwriting.service';
import { ListUnderwritingCasesQueryDto } from './dto/list-underwriting-cases-query.dto';
import { UnderwritingCaseListResponseDto, UnderwritingCaseResponseDto } from './dto/underwriting-case-response.dto';
import { UpdateUnderwritingCaseDto } from './dto/update-underwriting-case.dto';
import { UpsertUnderwritingChecklistDto } from './dto/upsert-underwriting-checklist.dto';

@ApiTags('AdminUnderwriting')
@ApiBearerAuth('bearer')
@Controller('admin/underwriting/cases')
@UseGuards(AdminAuthGuard, RolesGuard, PermissionsGuard)
export class AdminUnderwritingController {
  constructor(private readonly service: AdminUnderwritingService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'List underwriting cases with filters' })
  @ApiOkResponse({
    type: UnderwritingCaseListResponseDto,
    example: {
      items: [
        {
          applicationId: 'cmlxapp001',
          borrowerId: 'cmlxb001',
          status: 'IN_REVIEW',
          createdAt: '2026-02-12T12:00:00.000Z'
        }
      ],
      nextCursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTEyVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImNtbHh1dzEifQ'
    }
  })
  async list(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: ListUnderwritingCasesQueryDto
  ): Promise<UnderwritingCaseListResponseDto> {
    return this.service.listCases(admin, query);
  }

  @Get(':applicationId')
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'Get underwriting case by application ID' })
  @ApiOkResponse({ type: UnderwritingCaseResponseDto })
  async getByApplicationId(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('applicationId') applicationId: string
  ): Promise<UnderwritingCaseResponseDto> {
    return this.service.getCase(admin, applicationId);
  }

  @Patch(':applicationId')
  @RequirePermissions('UNDERWRITING_EDIT')
  @ApiOperation({ summary: 'Update underwriting case fields and status' })
  @ApiOkResponse({ type: UnderwritingCaseResponseDto })
  async updateCase(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('applicationId') applicationId: string,
    @Body() body: UpdateUnderwritingCaseDto
  ): Promise<UnderwritingCaseResponseDto> {
    return this.service.updateCase(admin, applicationId, body);
  }

  @Post(':applicationId/checklist')
  @RequirePermissions('UNDERWRITING_EDIT')
  @ApiOperation({ summary: 'Bulk upsert underwriting checklist items' })
  @ApiOkResponse({ type: UnderwritingCaseResponseDto })
  async upsertChecklist(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('applicationId') applicationId: string,
    @Body() body: UpsertUnderwritingChecklistDto
  ): Promise<UnderwritingCaseResponseDto> {
    return this.service.upsertChecklist(admin, applicationId, body);
  }
}
