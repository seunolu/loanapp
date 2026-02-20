import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestWithId } from '../../common/types/request-with-id';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { WebhookVerifyService } from '../../integrations/webhook-verify.service';
import { PaymentIntentsService } from './payment-intents.service';

@ApiTags('Payments')
@Controller('payments/webhooks')
export class PaymentsWebhookController {
  constructor(
    private readonly service: PaymentIntentsService,
    private readonly webhookVerifyService: WebhookVerifyService
  ) {}

  @Post('paystack')
  @RateLimit('PAYMENT_WEBHOOK')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook callback for payment intents' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true }
      }
    }
  })
  async paystackWebhook(
    @Req() req: RequestWithId,
    @Headers('x-paystack-signature') signature: string | undefined,
    @Body() body: unknown
  ) {
    await this.webhookVerifyService.verifyPaystackOrThrow(req);
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(body ?? {});
    await this.service.handlePaystackWebhook(body, signature, rawBody);
    return { ok: true };
  }
}
