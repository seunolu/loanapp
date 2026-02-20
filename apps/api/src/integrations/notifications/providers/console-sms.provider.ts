import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SendSmsInput } from '../../contracts/notifications.provider';

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  async sendSms(input: SendSmsInput): Promise<void> {
    this.logger.log({
      action: 'SMS_SEND',
      metadata: {
        to: input.to,
        messageLength: input.message.length
      }
    });
  }
}

