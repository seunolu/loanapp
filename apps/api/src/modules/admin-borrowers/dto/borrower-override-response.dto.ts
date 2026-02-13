import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BorrowerOverrideResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  borrowerId!: string;

  @ApiPropertyOptional({ nullable: true })
  maxLoanKobo!: number | null;

  @ApiPropertyOptional({ nullable: true })
  maxTenorDays!: number | null;

  @ApiProperty()
  updatedById!: string;

  @ApiProperty()
  updatedAt!: string;
}

