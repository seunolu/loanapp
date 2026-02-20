import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminListLoanApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ['SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE'] })
  @IsOptional()
  @IsIn(['SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_DOCUMENTS', 'APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE'])
  status?: 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUESTED_DOCUMENTS' | 'APPROVED' | 'READY_FOR_DISBURSEMENT' | 'DISBURSED' | 'OVERDUE';

  @ApiPropertyOptional({ enum: ['OVERDUE'] })
  @IsOptional()
  @IsIn(['OVERDUE'])
  queue?: 'OVERDUE';

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}
