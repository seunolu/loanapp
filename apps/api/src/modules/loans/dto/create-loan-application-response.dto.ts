import { ApiProperty } from '@nestjs/swagger';

export class CreateLoanApplicationResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'DISBURSED', 'REPAID', 'DEFAULTED', 'REJECTED'] })
  status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'DISBURSED' | 'REPAID' | 'DEFAULTED' | 'REJECTED';
}
