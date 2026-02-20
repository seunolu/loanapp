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

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'DISBURSED', 'REPAID', 'DEFAULTED', 'REJECTED'] })
  status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'DISBURSED' | 'REPAID' | 'DEFAULTED' | 'REJECTED';

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
