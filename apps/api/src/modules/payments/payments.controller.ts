import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { Idempotent } from '../../common/idempotency/idempotency.decorator';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { InitializePaymentResponseDto } from './dto/initialize-payment-response.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth('bearer')
@Controller('payments')
@UseGuards(BorrowerAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  @Idempotent('INIT_PAYMENT')
  @ApiOperation({ summary: 'Initialize borrower loan repayment payment' })
  @ApiOkResponse({ type: InitializePaymentResponseDto })
  async initialize(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: InitializePaymentDto
  ): Promise<InitializePaymentResponseDto> {
    return this.paymentsService.initialize(borrower, body);
  }
}
