import { ApiProperty } from '@nestjs/swagger';

export class RejectLoanApplicationResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ['REJECTED'] })
  status!: 'REJECTED';

  @ApiProperty()
  reviewReason!: string;
}
