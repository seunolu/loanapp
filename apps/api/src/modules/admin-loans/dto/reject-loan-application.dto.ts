import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectLoanApplicationDto {
  @ApiProperty({ example: 'Affordability risk score too low.' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
