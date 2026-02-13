import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    example: '+2348012345678',
    description: 'Borrower phone number in international format.'
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone must be a valid international phone number'
  })
  phone!: string;
}
