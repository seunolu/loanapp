import { ApiProperty } from '@nestjs/swagger';

export class TenantLoanApplicationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'] })
  status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';

  @ApiProperty()
  createdAt!: string;
}
