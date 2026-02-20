import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { AdminConfirmationGuard } from '../../common/admin-confirmation/admin-confirmation.guard';
import { RequireAdminConfirmation } from '../../common/admin-confirmation/admin-confirmation.decorator';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { transitionLoanApplicationSchema } from '../loan-applications/dto/transition-loan-application.dto';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';
import { AdminListLoanApplicationsQueryDto } from './dto/admin-list-loan-applications-query.dto';
import { AdminListLoanApplicationsResponseDto } from './dto/admin-list-loan-applications-response.dto';
import { AdminLoanApplicationDetailsDto } from './dto/admin-loan-application-details.dto';
import { AdminUpdateLoanApplicationStatusDto } from './dto/admin-update-loan-application-status.dto';
import { repayLoanApplicationSchema } from './dto/repay-loan-application.dto';
import { generateRepaymentScheduleSchema } from './dto/generate-repayment-schedule.dto';
import { accrueInterestSchema } from './dto/accrue-interest.dto';
import { createLoanRepaymentSchema } from './dto/create-loan-repayment.dto';
import { generateLoanScheduleSchema } from './dto/generate-loan-schedule.dto';
import { pauseInterestSchema } from './dto/pause-interest.dto';
import { removeInterestOverrideSchema } from './dto/remove-interest-override.dto';
import { setInterestOverrideSchema } from './dto/set-interest-override.dto';
import { disburseLoanNowSchema } from './dto/disburse-loan-now.dto';
import { createLoanApplicationHoldSchema } from './dto/create-loan-application-hold.dto';
import { riskOverrideSchema } from './dto/risk-override.dto';

@ApiTags('Admin Loan Applications')
@ApiBearerAuth('bearer')
@Controller('admin/loan-applications')
@UseGuards(TenantAdminAuthGuard)
export class AdminLoanApplicationsController {
  constructor(private readonly adminLoanApplicationsService: AdminLoanApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List tenant loan applications for admin review' })
  @ApiOkResponse({ type: AdminListLoanApplicationsResponseDto })
  list(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: AdminListLoanApplicationsQueryDto
  ): Promise<AdminListLoanApplicationsResponseDto> {
    return this.adminLoanApplicationsService.list(admin, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant loan application details with events' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  findOne(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    return this.adminLoanApplicationsService.findOne(admin, id);
  }

  @Patch(':id/status')
  @RateLimit('LOAN_MUTATION')
  @UseGuards(AdminConfirmationGuard)
  @RequireAdminConfirmation({ purpose: 'APPROVE_LOAN', resourceParam: 'id' })
  @ApiOperation({ summary: 'Update tenant loan application status' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  updateStatus(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: AdminUpdateLoanApplicationStatusDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    return this.adminLoanApplicationsService.updateStatus(admin, id, body);
  }

  @Post(':id/transition')
  @RateLimit('LOAN_MUTATION')
  @ApiOperation({ summary: 'Transition tenant loan application status' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  transition(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<AdminLoanApplicationDetailsDto> {
    const parsed = transitionLoanApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid transition payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.transition(admin, id, parsed.data);
  }

  @Post(':id/disburse')
  @RateLimit('LOAN_MUTATION')
  @UseGuards(AdminConfirmationGuard)
  @RequireAdminConfirmation({ purpose: 'DISBURSE_LOAN', resourceParam: 'id' })
  @ApiOperation({ summary: 'Process disbursement for a ready loan application and post ledger entries' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  disburse(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<AdminLoanApplicationDetailsDto> {
    const parsed = disburseLoanNowSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid disbursement payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.disburseNow(admin, id, parsed.data);
  }

  @Post(':id/ready-for-disbursement')
  @RateLimit('LOAN_MUTATION')
  @ApiOperation({ summary: 'Mark loan application ready for disbursement and create pending disbursement record' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  markReadyForDisbursement(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    return this.adminLoanApplicationsService.markReadyForDisbursement(admin, id);
  }

  @Post(':id/repay')
  @ApiOperation({ summary: 'Record a repayment and post ledger entries' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  repay(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<AdminLoanApplicationDetailsDto> {
    const parsed = repayLoanApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid repayment payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.repay(admin, id, parsed.data);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Generate repayment schedule for approved loan application' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  generateSchedule(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<AdminLoanApplicationDetailsDto> {
    const parsed = generateRepaymentScheduleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid schedule generation payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.generateSchedule(admin, id, parsed.data);
  }

  @Post(':id/generate-schedule')
  @ApiOperation({ summary: 'Generate repayment schedule for disbursed loan application' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  generateScheduleV2(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @Body() body: unknown
  ): Promise<AdminLoanApplicationDetailsDto> {
    const parsed = generateLoanScheduleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid schedule generation payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.generateScheduleV2(admin, id, parsed.data, force === 'true');
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'List repayment schedule items' })
  @ApiOkResponse()
  listSchedule(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.listSchedule(admin, id);
  }

  @Post(':id/accrue-interest')
  @ApiOperation({ summary: 'Accrue interest receivable through a given date' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  accrueInterest(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<AdminLoanApplicationDetailsDto> {
    const parsed = accrueInterestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid accrual payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.accrueInterest(admin, id, parsed.data);
  }

  @Post(':id/repayments')
  @ApiOperation({ summary: 'Post repayment for a loan application' })
  @ApiOkResponse()
  postRepayment(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = createLoanRepaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid repayment payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.postRepaymentV2(admin, id, parsed.data);
  }

  @Get(':id/repayments')
  @ApiOperation({ summary: 'List loan repayments (latest first)' })
  @ApiOkResponse()
  listRepayments(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.listRepayments(admin, id);
  }

  @Post(':id/recalc-delinquency')
  @ApiOperation({ summary: 'Recalculate delinquency for a single loan application' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  recalcDelinquency(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.recalcDelinquency(admin, id);
  }

  @Post(':id/pause-interest')
  @RateLimit('LOAN_MUTATION')
  @UseGuards(AdminConfirmationGuard)
  @RequireAdminConfirmation({ purpose: 'PAUSE_INTEREST', resourceParam: 'id' })
  @ApiOperation({ summary: 'Pause interest accrual on a loan application' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  pauseInterest(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = pauseInterestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid pause-interest payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.pauseInterest(admin, id, parsed.data);
  }

  @Post(':id/resume-interest')
  @RateLimit('LOAN_MUTATION')
  @UseGuards(AdminConfirmationGuard)
  @RequireAdminConfirmation({ purpose: 'RESUME_INTEREST', resourceParam: 'id' })
  @ApiOperation({ summary: 'Resume interest accrual on a loan application' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  resumeInterest(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.resumeInterest(admin, id);
  }

  @Post(':id/set-interest-override')
  @ApiOperation({ summary: 'Set temporary interest rate override on a loan application' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  setInterestOverride(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = setInterestOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid set-interest-override payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.setInterestOverride(admin, id, parsed.data);
  }

  @Post(':id/remove-interest-override')
  @ApiOperation({ summary: 'Remove interest rate override on a loan application' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  removeInterestOverride(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = removeInterestOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid remove-interest-override payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.removeInterestOverride(admin, id, parsed.data);
  }

  @Get(':id/interest-audit')
  @ApiOperation({ summary: 'List interest accrual control audit entries for a loan application' })
  @ApiOkResponse()
  listInterestAudit(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.listInterestAudit(admin, id);
  }

  @Get(':id/risk')
  @ApiOperation({ summary: 'Get risk assessment, active holds and history for a loan application' })
  @ApiOkResponse()
  getRisk(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.getRisk(admin, id);
  }

  @Post(':id/holds')
  @ApiOperation({ summary: 'Add a risk hold on a loan application' })
  @ApiOkResponse()
  addHold(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = createLoanApplicationHoldSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid hold payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.addHold(admin, id, parsed.data);
  }

  @Post(':id/risk/override')
  @ApiOperation({ summary: 'Override risk decision to APPROVE (RISK_MANAGER/SUPER_ADMIN)' })
  @ApiOkResponse()
  overrideRisk(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = riskOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid risk override payload.',
        details: parsed.error.flatten()
      });
    }
    return this.adminLoanApplicationsService.overrideRisk(admin, id, parsed.data);
  }

  @Post(':id/risk-evaluate')
  @ApiOperation({ summary: 'Run manual risk evaluation for a loan application' })
  @ApiOkResponse()
  runRiskEvaluation(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.runRiskEvaluation(admin, id);
  }

  @Post(':id/fraud-check')
  @ApiOperation({ summary: 'Run fraud signal evaluation for a loan application' })
  @ApiOkResponse()
  runFraudCheck(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.runFraudCheck(admin, id);
  }

  @Post(':id/decide')
  @RateLimit('LOAN_MUTATION')
  @ApiOperation({ summary: 'Run deterministic credit decision orchestrator and transition lifecycle' })
  @ApiOkResponse()
  decide(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.decide(admin, id);
  }

  @Get(':id/risk-evaluations')
  @ApiOperation({ summary: 'List risk evaluations for a loan application' })
  @ApiOkResponse()
  listRiskEvaluations(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    return this.adminLoanApplicationsService.listRiskEvaluations(admin, id);
  }

  @Post(':id/identity/approve')
  @ApiOperation({ summary: 'Approve MANUAL_REVIEW identity verification (SUPER_ADMIN only)' })
  @ApiOkResponse({ type: AdminLoanApplicationDetailsDto })
  approveIdentityManualReview(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    return this.adminLoanApplicationsService.approveIdentityManualReview(admin, id);
  }

}
