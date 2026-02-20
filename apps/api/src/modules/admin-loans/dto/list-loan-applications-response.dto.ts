import { ApiProperty } from '@nestjs/swagger';

export class AdminLoanApplicationListItemDto {
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

  @ApiProperty({ format: 'date-time', nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ nullable: true })
  reviewReason!: string | null;
}

export class ListLoanApplicationsResponseDto {
  @ApiProperty({ type: [AdminLoanApplicationListItemDto] })
  items!: AdminLoanApplicationListItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}
