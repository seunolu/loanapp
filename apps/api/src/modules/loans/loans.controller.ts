import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { Idempotent } from '../../common/idempotency/idempotency.decorator';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { AcceptOfferResponseDto } from './dto/accept-offer-response.dto';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { CreateLoanApplicationResponseDto } from './dto/create-loan-application-response.dto';
import { LoanApplicationDetailsDto } from './dto/loan-application-details.dto';
import { LoanOfferDetailsDto } from './dto/loan-offer-details.dto';
import { LoanScheduleResponseDto } from './dto/loan-schedule-response.dto';
import { LoansService } from './loans.service';

@ApiTags('Loans')
@ApiBearerAuth('bearer')
@Controller('loans')
@UseGuards(BorrowerAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create loan application for authenticated borrower' })
  @ApiOkResponse({ type: CreateLoanApplicationResponseDto })
  async createApplication(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: CreateLoanApplicationDto
  ): Promise<CreateLoanApplicationResponseDto> {
    return this.loansService.createApplication(borrower, body);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get borrower loan application by id' })
  @ApiOkResponse({ type: LoanApplicationDetailsDto })
  async getApplication(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Param('id') id: string
  ): Promise<LoanApplicationDetailsDto> {
    return this.loansService.getApplication(borrower, id);
  }

  @Get('offers/:applicationId')
  @ApiOperation({ summary: 'Get borrower loan offer by application id' })
  @ApiOkResponse({ type: LoanOfferDetailsDto })
  async getOffer(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Param('applicationId') applicationId: string
  ): Promise<LoanOfferDetailsDto> {
    return this.loansService.getOfferByApplication(borrower, applicationId);
  }

  @Post('offers/:offerId/accept')
  @HttpCode(HttpStatus.OK)
  @Idempotent('ACCEPT_OFFER')
  @ApiOperation({ summary: 'Accept borrower loan offer and create loan contract' })
  @ApiOkResponse({ type: AcceptOfferResponseDto })
  async acceptOffer(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Param('offerId') offerId: string
  ): Promise<AcceptOfferResponseDto> {
    return this.loansService.acceptOffer(borrower, offerId);
  }

  @Post('offers/:offerId/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline borrower loan offer' })
  @ApiNoContentResponse()
  async declineOffer(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Param('offerId') offerId: string
  ): Promise<void> {
    await this.loansService.declineOffer(borrower, offerId);
  }

  @Get(':loanId/schedule')
  @ApiOperation({ summary: 'Get borrower loan repayment schedule' })
  @ApiOkResponse({ type: LoanScheduleResponseDto })
  async getSchedule(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Param('loanId') loanId: string
  ): Promise<LoanScheduleResponseDto> {
    return this.loansService.getScheduleForBorrower(borrower, loanId);
  }
}
