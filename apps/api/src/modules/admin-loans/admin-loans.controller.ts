import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminLoansService } from './admin-loans.service';
import { AccruePenaltyDto } from './dto/accrue-penalty.dto';
import { AccruePenaltyResponseDto } from './dto/accrue-penalty-response.dto';
import { ApproveLoanApplicationDto } from './dto/approve-loan-application.dto';
import { ApproveLoanApplicationResponseDto } from './dto/approve-loan-application-response.dto';
import { ListLoanApplicationsQueryDto } from './dto/list-loan-applications-query.dto';
import { ListLoanApplicationsResponseDto } from './dto/list-loan-applications-response.dto';
import { ListPenaltiesResponseDto } from './dto/list-penalties-response.dto';
import { OfferPreviewResponseDto } from './dto/offer-preview-response.dto';
import { RejectLoanApplicationDto } from './dto/reject-loan-application.dto';
import { RejectLoanApplicationResponseDto } from './dto/reject-loan-application-response.dto';
import { LoanScheduleResponseDto } from '../loans/dto/loan-schedule-response.dto';

@ApiTags('AdminLoans')
@ApiBearerAuth('bearer')
@Controller('admin/loans')
@UseGuards(AdminAuthGuard, RolesGuard, PermissionsGuard)
export class AdminLoansController {
  constructor(private readonly adminLoansService: AdminLoansService) {}

  @Get('applications')
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'List loan applications for admin review queue' })
  @ApiOkResponse({
    type: ListLoanApplicationsResponseDto,
    example: {
      items: [
        {
          id: 'cmlxapp001',
          borrowerId: 'cmlxb001',
          amountRequested: 1500000,
          tenorDays: 30,
          status: 'SUBMITTED',
          submittedAt: '2026-02-12T12:00:00.000Z',
          reviewedAt: null,
          reviewReason: null
        }
      ],
      nextCursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTEyVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImNtbHhhcHAwMDEifQ'
    }
  })
  async listApplications(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: ListLoanApplicationsQueryDto
  ): Promise<ListLoanApplicationsResponseDto> {
    return this.adminLoansService.listApplications(admin, query);
  }

  @Post('applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('LOANS_APPROVE')
  @ApiOperation({ summary: 'Approve submitted loan application and create loan offer' })
  @ApiOkResponse({ type: ApproveLoanApplicationResponseDto })
  async approve(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: ApproveLoanApplicationDto
  ): Promise<ApproveLoanApplicationResponseDto> {
    return this.adminLoansService.approveApplication(admin, id, body);
  }

  @Post('applications/:id/offer/preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('LOANS_APPROVE')
  @ApiOperation({ summary: 'Preview computed loan offer for application' })
  @ApiOkResponse({
    type: OfferPreviewResponseDto,
    example: {
      applicationId: 'cmlxapp0001',
      principalAmount: 1500000,
      interestAmount: 150000,
      feeAmount: 25000,
      totalRepayable: 1675000,
      expiresAt: '2026-02-20T10:00:00.000Z',
      scheduleType: 'WEEKLY_EQUAL',
      schedule: [
        { dueDate: '2026-02-19T10:00:00.000Z', amount: 418750 },
        { dueDate: '2026-02-26T10:00:00.000Z', amount: 418750 },
        { dueDate: '2026-03-05T10:00:00.000Z', amount: 418750 },
        { dueDate: '2026-03-12T10:00:00.000Z', amount: 418750 }
      ],
      pricingSnapshot: {
        interestRateBpsMonthly: 500,
        originationFeeKoboFlat: 0,
        originationFeeBps: 0,
        scheduleType: 'WEEKLY_EQUAL',
        offerExpiryHours: 168
      }
    }
  })
  async previewOffer(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: ApproveLoanApplicationDto
  ): Promise<OfferPreviewResponseDto> {
    return this.adminLoansService.previewOffer(admin, id, body);
  }

  @Post('applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('LOANS_APPROVE')
  @ApiOperation({ summary: 'Reject submitted loan application' })
  @ApiOkResponse({ type: RejectLoanApplicationResponseDto })
  async reject(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() body: RejectLoanApplicationDto
  ): Promise<RejectLoanApplicationResponseDto> {
    return this.adminLoansService.rejectApplication(admin, id, body);
  }

  @Get(':loanId/schedule')
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'Get repayment schedule for a loan (admin)' })
  @ApiOkResponse({ type: LoanScheduleResponseDto })
  async getSchedule(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('loanId') loanId: string
  ): Promise<LoanScheduleResponseDto> {
    return this.adminLoansService.getScheduleForAdmin(admin, loanId);
  }

  @Post(':loanId/accrue-penalty')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE')
  @ApiOperation({ summary: 'Accrue daily penalty for an overdue loan' })
  @ApiOkResponse({ type: AccruePenaltyResponseDto })
  async accruePenalty(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('loanId') loanId: string,
    @Body() body: AccruePenaltyDto
  ): Promise<AccruePenaltyResponseDto> {
    return this.adminLoansService.accruePenalty(admin, loanId, body);
  }

  @Get(':loanId/penalties')
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'List penalty accruals for a loan' })
  @ApiOkResponse({ type: ListPenaltiesResponseDto })
  async listPenalties(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('loanId') loanId: string
  ): Promise<ListPenaltiesResponseDto> {
    return this.adminLoansService.listPenalties(admin, loanId);
  }
}
