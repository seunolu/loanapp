import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BorrowerProfileDto {
  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  dateOfBirth!: string;

  @ApiPropertyOptional({ nullable: true })
  gender!: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressLine1!: string | null;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  state!: string | null;
}

class BorrowerOverrideDto {
  @ApiPropertyOptional({ nullable: true })
  maxLoanKobo!: number | null;

  @ApiPropertyOptional({ nullable: true })
  maxTenorDays!: number | null;

  @ApiProperty()
  updatedAt!: string;
}

class BorrowerNoteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  note!: string;

  @ApiProperty()
  createdById!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AdminBorrowerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lenderId!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: BorrowerProfileDto, nullable: true })
  profile!: BorrowerProfileDto | null;

  @ApiProperty({ type: BorrowerOverrideDto, nullable: true })
  override!: BorrowerOverrideDto | null;

  @ApiProperty({ type: [BorrowerNoteDto] })
  notes!: BorrowerNoteDto[];
}

export class AdminBorrowerListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional({ nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AdminBorrowerListResponseDto {
  @ApiProperty({ type: [AdminBorrowerListItemDto] })
  items!: AdminBorrowerListItemDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

