import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class InitializePaymentDto {
  @ApiProperty()
  @IsString()
  loanId!: string;

  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(1)
  amountKobo!: number;
}
