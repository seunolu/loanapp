import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateUnderwritingCaseDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED'] })
  @IsOptional()
  @IsIn(['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED'])
  status?: 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyIncomeKobo?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  existingDebtKobo?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  riskLevel?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionNotes?: string | null;
}

