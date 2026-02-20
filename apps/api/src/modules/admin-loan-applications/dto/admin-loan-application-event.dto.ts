import { ApiProperty } from '@nestjs/swagger';

export class AdminLoanApplicationEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  loanApplicationId!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF', 'SETTLED', 'REPAID', 'DEFAULTED', 'REJECTED'], nullable: true })
  fromStatus!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'OVERDUE' | 'WRITTEN_OFF' | 'SETTLED' | 'REPAID' | 'DEFAULTED' | 'REJECTED' | null;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF', 'SETTLED', 'REPAID', 'DEFAULTED', 'REJECTED'] })
  toStatus!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'OVERDUE' | 'WRITTEN_OFF' | 'SETTLED' | 'REPAID' | 'DEFAULTED' | 'REJECTED';

  @ApiProperty({ nullable: true })
  note!: string | null;

  @ApiProperty({ nullable: true })
  changedByUserId!: string | null;

  @ApiProperty()
  changedAt!: string;
}
