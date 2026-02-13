import { ApiProperty } from '@nestjs/swagger';

export class InitializePaymentResponseDto {
  @ApiProperty()
  paymentId!: string;

  @ApiProperty({ enum: ['PAYSTACK'] })
  provider!: 'PAYSTACK';

  @ApiProperty()
  authorizationUrl!: string;

  @ApiProperty()
  reference!: string;
}
