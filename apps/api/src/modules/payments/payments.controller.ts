import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { Idempotent } from '../../common/idempotency/idempotency.decorator';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { InitializePaymentResponseDto } from './dto/initialize-payment-response.dto';
import { PaymentIntentsService } from './payment-intents.service';
import { PaymentsService } from './payments.service';

const repaymentInitiateSchema = z.object({
  loanId: z.string().trim().min(1),
  amount: z.coerce.number().positive()
});

@ApiTags('Payments')
@ApiBearerAuth('bearer')
@Controller('payments')
@UseGuards(BorrowerAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentIntentsService: PaymentIntentsService
  ) {}

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

  @Post('repayments/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize repayment intent (Paystack-first)' })
  @ApiOkResponse()
  async initiateRepayment(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: unknown,
    @Headers('idempotency-key') _idempotencyKey: string | undefined
  ) {
    const parsed = repaymentInitiateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid repayment initiate payload.',
        details: parsed.error.flatten()
      });
    }
    const response = await this.paymentIntentsService.initializeBorrowerRepayment(
      borrower,
      parsed.data,
      _idempotencyKey
    );
    return {
      paymentIntentId: response.id,
      reference: response.reference ?? response.providerReference,
      authorizationUrl: response.authorizationUrl
    };
  }
}
