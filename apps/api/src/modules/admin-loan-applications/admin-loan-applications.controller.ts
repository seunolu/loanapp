import { Body, Controller, Get, Headers, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';
import { AdminListLoanApplicationsQueryDto } from './dto/admin-list-loan-applications-query.dto';
import { AdminListLoanApplicationsResponseDto } from './dto/admin-list-loan-applications-response.dto';
import { AdminLoanApplicationDetailsDto } from './dto/admin-loan-application-details.dto';
import { AdminUpdateLoanApplicationStatusDto } from './dto/admin-update-loan-application-status.dto';

@ApiTags('Admin Loan Applications')
@ApiBearerAuth('bearer')
@Controller('admin/loan-applications')
@UseGuards(TenantAdminAuthGuard)
export class AdminLoanApplicationsController {
  constructor(private readonly adminLoanApplicationsService: AdminLoanApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List tenant loan applications for admin review' })
  @ApiHeader({ name: 'x-tenant-id', required: false, description: 'Optional for SUPER_ADMIN impersonation' })
  @ApiOkResponse({ type: AdminListLoanApplicationsResponseDto })
  list(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: AdminListLoanApplicationsQueryDto,
    @Headers('x-tenant-id') tenantId?: string
  ): Promise<AdminListLoanApplicationsResponseDto> {
    return this.adminLoanApplicationsService.list(admin, query, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant loan application details with events' })
  @ApiHeader({ name: 'x-tenant-id', required: false, description: 'Optional for SUPER_ADMIN impersonation' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  findOne(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId?: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    return this.adminLoanApplicationsService.findOne(admin, id, tenantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update tenant loan application status' })
  @ApiHeader({ name: 'x-tenant-id', required: false, description: 'Optional for SUPER_ADMIN impersonation' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  updateStatus(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: AdminUpdateLoanApplicationStatusDto,
    @Headers('x-tenant-id') tenantId?: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    return this.adminLoanApplicationsService.updateStatus(admin, id, body, tenantId);
  }
}

