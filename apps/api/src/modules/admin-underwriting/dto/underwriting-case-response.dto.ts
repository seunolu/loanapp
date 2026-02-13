import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UnderwritingChecklistItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: ['PENDING', 'PASSED', 'FAILED'] })
  status!: 'PENDING' | 'PASSED' | 'FAILED';

  @ApiProperty()
  isRequired!: boolean;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
}

export class UnderwritingCaseResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  borrowerId!: string;

  @ApiProperty({ enum: ['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED'] })
  status!: 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';

  @ApiPropertyOptional({ nullable: true })
  monthlyIncomeKobo!: number | null;

  @ApiPropertyOptional({ nullable: true })
  existingDebtKobo!: number | null;

  @ApiPropertyOptional({ nullable: true })
  riskLevel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  decisionNotes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  decidedByAdminId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ type: [UnderwritingChecklistItemDto] })
  checklist!: UnderwritingChecklistItemDto[];
}

class UnderwritingCaseListItemDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  borrowerId!: string;

  @ApiProperty({ enum: ['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED'] })
  status!: 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';

  @ApiProperty()
  createdAt!: string;
}

export class UnderwritingCaseListResponseDto {
  @ApiProperty({ type: [UnderwritingCaseListItemDto] })
  items!: UnderwritingCaseListItemDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

