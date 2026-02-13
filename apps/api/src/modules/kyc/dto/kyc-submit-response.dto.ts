import { ApiProperty } from '@nestjs/swagger';

export class KycSubmitResponseDto {
  @ApiProperty()
  kycCaseId!: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiProperty({ format: 'date-time', nullable: true })
  submittedAt!: string | null;
}
