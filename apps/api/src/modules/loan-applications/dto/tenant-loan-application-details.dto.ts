import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantLoanApplicationDetailsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'] })
  status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  dob?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  tenorMonths!: number;

  @ApiPropertyOptional()
  purpose?: string;

  @ApiPropertyOptional()
  employmentStatus?: string;

  @ApiPropertyOptional()
  incomeBand?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
