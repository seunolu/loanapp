import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class CreateLoanApplicationDto {
  @ApiProperty({ example: 1500000, description: 'Requested amount in kobo' })
  @IsInt()
  @Min(500000)
  @Max(10000000)
  amountRequested!: number;

  @ApiProperty({ example: 30, description: 'Loan tenor in days' })
  @IsInt()
  @Min(7)
  @Max(60)
  tenorDays!: number;
}
