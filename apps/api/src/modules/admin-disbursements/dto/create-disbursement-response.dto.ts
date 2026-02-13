import { ApiProperty } from '@nestjs/swagger';

export class CreateDisbursementResponseDto {
  @ApiProperty()
  disbursementId!: string;

  @ApiProperty()
  loanId!: string;

  @ApiProperty({ enum: ['INITIATED'] })
  status!: 'INITIATED';

  @ApiProperty()
  amountKobo!: number;
}
