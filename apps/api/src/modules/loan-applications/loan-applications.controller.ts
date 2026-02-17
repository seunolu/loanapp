import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTenantLoanApplicationDto } from './dto/create-tenant-loan-application.dto';
import { ListTenantLoanApplicationsResponseDto } from './dto/list-tenant-loan-applications-response.dto';
import { TenantLoanApplicationDetailsDto } from './dto/tenant-loan-application-details.dto';
import { TenantLoanApplicationSummaryDto } from './dto/tenant-loan-application-summary.dto';
import { LoanApplicationsService } from './loan-applications.service';

@ApiTags('Loan Applications')
@Controller('loan-applications')
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant ID returned by GET /tenants/resolve'
})
export class LoanApplicationsController {
  constructor(private readonly loanApplicationsService: LoanApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a tenant-scoped loan application' })
  @ApiOkResponse({ type: TenantLoanApplicationSummaryDto })
  create(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() body: CreateTenantLoanApplicationDto
  ): Promise<TenantLoanApplicationSummaryDto> {
    return this.loanApplicationsService.create(tenantId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant-scoped loan application by id' })
  @ApiOkResponse({ type: TenantLoanApplicationDetailsDto })
  @ApiNotFoundResponse({ description: 'Loan application not found.' })
  findOne(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string
  ): Promise<TenantLoanApplicationDetailsDto> {
    return this.loanApplicationsService.findOne(tenantId, id);
  }

  @Get()
  @ApiOperation({ summary: 'List tenant-scoped loan applications' })
  @ApiOkResponse({ type: ListTenantLoanApplicationsResponseDto })
  list(@Headers('x-tenant-id') tenantId: string | undefined): Promise<ListTenantLoanApplicationsResponseDto> {
    return this.loanApplicationsService.list(tenantId);
  }
}

