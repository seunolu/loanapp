import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { KycStatusResponseDto } from './dto/kyc-status-response.dto';
import { KycSubmitResponseDto } from './dto/kyc-submit-response.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { KycService } from './kyc.service';

@ApiTags('KYC')
@ApiBearerAuth('bearer')
@Controller('kyc')
@UseGuards(BorrowerAuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit borrower KYC documents' })
  @ApiOkResponse({ type: KycSubmitResponseDto })
  async submit(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: SubmitKycDto
  ): Promise<KycSubmitResponseDto> {
    return this.kycService.submit(borrower, body);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get borrower KYC status' })
  @ApiOkResponse({ type: KycStatusResponseDto })
  async status(@CurrentBorrower() borrower: BorrowerPrincipal): Promise<KycStatusResponseDto> {
    return this.kycService.status(borrower);
  }
}
