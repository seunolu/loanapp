import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { PaymentIntentsService } from './payment-intents.service';

const initializeRepaymentSchema = z.object({
  loanId: z.string().min(1),
  amount: z.coerce.number().positive(),
  channel: z.string().optional()
});

const verifyRepaymentSchema = z.object({
  reference: z.string().min(1)
});

@ApiTags('Repayments')
@ApiBearerAuth('bearer')
@Controller('repayments')
@UseGuards(BorrowerAuthGuard)
export class RepaymentsController {
  constructor(private readonly paymentIntentsService: PaymentIntentsService) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize borrower repayment payment intent' })
  @ApiOkResponse()
  async initialize(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: unknown
  ) {
    const parsed = initializeRepaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid repayment initialize payload.',
        details: parsed.error.flatten()
      });
    }
    return this.paymentIntentsService.initializeBorrowerRepayment(borrower, parsed.data);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify borrower repayment by provider reference' })
  @ApiOkResponse()
  async verify(@CurrentBorrower() borrower: BorrowerPrincipal, @Body() body: unknown) {
    const parsed = verifyRepaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid repayment verify payload.',
        details: parsed.error.flatten()
      });
    }
    return this.paymentIntentsService.verifyBorrowerRepayment(borrower, parsed.data.reference);
  }
}
