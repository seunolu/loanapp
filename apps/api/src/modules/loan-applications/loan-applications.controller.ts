import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { TenantLoanApplicationStatus } from '@prisma/client';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { CreateTenantLoanApplicationDto } from './dto/create-tenant-loan-application.dto';
import { ListTenantLoanApplicationsResponseDto } from './dto/list-tenant-loan-applications-response.dto';
import { TenantLoanApplicationDetailsDto } from './dto/tenant-loan-application-details.dto';
import { TenantLoanApplicationSummaryDto } from './dto/tenant-loan-application-summary.dto';
import { transitionLoanApplicationSchema } from './dto/transition-loan-application.dto';
import { LoanApplicationsService } from './loan-applications.service';

@ApiTags('Loan Applications')
@Controller('loan-applications')
export class LoanApplicationsController {
  constructor(private readonly loanApplicationsService: LoanApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a tenant-scoped loan application' })
  @ApiOkResponse({ type: TenantLoanApplicationSummaryDto })
  create(@Body() body: CreateTenantLoanApplicationDto): Promise<TenantLoanApplicationSummaryDto> {
    return this.loanApplicationsService.create(body);
  }

  @Get(':id')
  @UseGuards(TenantAdminAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get a tenant-scoped loan application by id' })
  @ApiOkResponse({ type: TenantLoanApplicationDetailsDto })
  @ApiNotFoundResponse({ description: 'Loan application not found.' })
  findOne(@Param('id') id: string): Promise<TenantLoanApplicationDetailsDto> {
    return this.loanApplicationsService.findOne(id);
  }

  @Post(':id/transition')
  @UseGuards(TenantAdminAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Transition loan application status with guardrails and history logging' })
  @ApiOkResponse({ type: TenantLoanApplicationDetailsDto })
  transition(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<TenantLoanApplicationDetailsDto> {
    const parsed = transitionLoanApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid transition payload.',
        details: parsed.error.flatten()
      });
    }

    return this.loanApplicationsService.transitionStatus(
      admin.tenantId,
      id,
      parsed.data.toStatus as TenantLoanApplicationStatus,
      admin.role,
      parsed.data.note,
      admin.adminId
    );
  }

  @Get()
  @ApiOperation({ summary: 'List tenant-scoped loan applications' })
  @ApiOkResponse({ type: ListTenantLoanApplicationsResponseDto })
  list(): Promise<ListTenantLoanApplicationsResponseDto> {
    return this.loanApplicationsService.list();
  }
}
