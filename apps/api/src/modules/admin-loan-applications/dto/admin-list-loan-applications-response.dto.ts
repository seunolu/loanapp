import { ApiProperty } from '@nestjs/swagger';
import { AdminLoanApplicationDetailsDto } from './admin-loan-application-details.dto';

class AdminLoanApplicationListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF', 'SETTLED', 'REPAID', 'DEFAULTED', 'REJECTED'] })
  status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'OVERDUE' | 'WRITTEN_OFF' | 'SETTLED' | 'REPAID' | 'DEFAULTED' | 'REJECTED';

  @ApiProperty({ enum: ['CURRENT', 'OVERDUE', 'CHARGED_OFF'] })
  delinquencyStatus!: 'CURRENT' | 'OVERDUE' | 'CHARGED_OFF';

  @ApiProperty()
  daysPastDue!: number;

  @ApiProperty()
  overdueAmountCents!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  tenorMonths!: number;

  @ApiProperty()
  createdAt!: string;
}

export class AdminListLoanApplicationsResponseDto {
  @ApiProperty({ type: [AdminLoanApplicationListItemDto] })
  items!: AdminLoanApplicationListItemDto[];
}
