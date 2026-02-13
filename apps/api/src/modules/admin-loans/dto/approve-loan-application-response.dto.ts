import { ApiProperty } from '@nestjs/swagger';

export class ApproveLoanApplicationResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ['APPROVED'] })
  status!: 'APPROVED';

  @ApiProperty()
  offerId!: string;

  @ApiProperty({ enum: ['OFFERED'] })
  offerStatus!: 'OFFERED';
}
