import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '1f2a2e9d-0056-4b1f-a4de-20f59de0f041' })
  @IsString()
  otpRef!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone must be a valid international phone number'
  })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit code' })
  otp!: string;

  @ApiProperty({ required: false, example: 'iphone-15-pro-max' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({ required: false, example: 'iPhone 15 Pro Max' })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiProperty({ required: false, example: 'ios' })
  @IsString()
  @IsOptional()
  platform?: string;
}
