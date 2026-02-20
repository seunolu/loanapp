import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, SendEmailInput } from '../../contracts/notifications.provider';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async sendEmail(input: SendEmailInput): Promise<void> {
    this.logger.log({
      action: 'EMAIL_SEND',
      metadata: {
        to: input.to,
        subject: input.subject
      }
    });
  }
}

