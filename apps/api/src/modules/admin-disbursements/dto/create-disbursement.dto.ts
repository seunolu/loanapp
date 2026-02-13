import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDisbursementDto {
  @ApiProperty()
  @IsString()
  loanId!: string;

  @ApiProperty()
  @IsString()
  bankAccountId!: string;
}
