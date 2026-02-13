import { ApiProperty } from '@nestjs/swagger';

export class CreateLoanApplicationResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] })
  status!: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
}
