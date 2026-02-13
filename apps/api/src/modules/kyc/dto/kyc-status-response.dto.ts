import { ApiProperty } from '@nestjs/swagger';

export class KycStatusResponseDto {
  @ApiProperty({ enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'] })
  status!: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiProperty({ format: 'date-time', nullable: true })
  lastUpdatedAt!: string | null;
}
