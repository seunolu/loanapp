import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestWithId } from '../../common/types/request-with-id';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { WebhookProcessorService } from '../../integrations/webhook-processor.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhookProcessorService: WebhookProcessorService) {}

  @Post('paystack')
  @RateLimit('PAYMENT_WEBHOOK')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Paystack webhook events' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        status: { type: 'string', example: 'PROCESSED' }
      }
    }
  })
  async paystack(
    @Req() req: RequestWithId,
    @Headers('x-paystack-signature') _signature: string | undefined,
    @Body() _body: unknown
  ): Promise<{ ok: true; status: 'RECEIVED' | 'IGNORED' }> {
    return this.webhookProcessorService.receivePaystackWebhook(req);
  }

  @Post('payments')
  @RateLimit('PAYMENT_WEBHOOK')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive normalized payment provider webhooks (Paystack-first)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true }
      }
    }
  })
  async payments(
    @Req() req: RequestWithId,
    @Headers('x-paystack-signature') _signature: string | undefined,
    @Body() _body: unknown
  ): Promise<{ ok: true }> {
    await this.webhookProcessorService.receivePaystackWebhook(req);
    return { ok: true };
  }
}
