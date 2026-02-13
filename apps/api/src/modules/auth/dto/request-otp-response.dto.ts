import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpResponseDto {
  @ApiProperty({ example: '1f2a2e9d-0056-4b1f-a4de-20f59de0f041' })
  otpRef!: string;

  @ApiProperty({ example: 900 })
  expiresInSec!: number;
}
