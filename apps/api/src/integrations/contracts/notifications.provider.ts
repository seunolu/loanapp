export type SendSmsInput = {
  to: string;
  message: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export interface SmsProvider {
  sendSms(input: SendSmsInput): Promise<void>;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<void>;
}

