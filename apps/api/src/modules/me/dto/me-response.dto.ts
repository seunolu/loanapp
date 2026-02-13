import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BorrowerProfileDto {
  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ example: '2000-05-01' })
  dateOfBirth!: string;

  @ApiPropertyOptional()
  gender!: string | null;

  @ApiPropertyOptional()
  addressLine1!: string | null;

  @ApiPropertyOptional()
  city!: string | null;

  @ApiPropertyOptional()
  state!: string | null;
}

export class MeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  status!: 'ACTIVE' | 'SUSPENDED';

  @ApiPropertyOptional({ type: BorrowerProfileDto, nullable: true })
  profile!: BorrowerProfileDto | null;

  @ApiProperty({ enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'], example: 'NOT_SUBMITTED' })
  kycStatus!: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ type: 'object', nullable: true, example: null })
  activeLoan!: Record<string, never> | null;
}
