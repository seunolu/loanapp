import { ApiProperty } from '@nestjs/swagger';

export class TenantLoanApplicationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF', 'SETTLED', 'REPAID', 'DEFAULTED', 'REJECTED'] })
  status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'OVERDUE' | 'WRITTEN_OFF' | 'SETTLED' | 'REPAID' | 'DEFAULTED' | 'REJECTED';

  @ApiProperty()
  createdAt!: string;
}
