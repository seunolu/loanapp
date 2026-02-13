import { ApiProperty } from '@nestjs/swagger';

export class LoanApplicationDetailsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  borrowerId!: string;

  @ApiProperty()
  amountRequested!: number;

  @ApiProperty()
  tenorDays!: number;

  @ApiProperty({ enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] })
  status!: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
