import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestWithId } from '../../common/types/request-with-id';
import { WebhooksService, type WebhookHandleResult } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('paystack')
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
    @Headers('x-paystack-signature') signature: string | undefined,
    @Body() body: unknown
  ): Promise<WebhookHandleResult> {
    return this.webhooksService.handlePaystackWebhook({
      signature,
      rawBody: req.rawBody,
      payload: body,
      requestId: req.requestId ?? null
    });
  }
}
