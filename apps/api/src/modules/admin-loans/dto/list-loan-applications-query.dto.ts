import { ApiPropertyOptional } from '@nestjs/swagger';
import { LoanApplicationStatus } from '@prisma/client';
import { CursorPaginationQueryDto } from '../../../common/pagination/dto/cursor-pagination-query.dto';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListLoanApplicationsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'], default: 'SUBMITTED' })
  @IsOptional()
  @IsEnum(LoanApplicationStatus)
  status?: LoanApplicationStatus;

  @ApiPropertyOptional({ description: 'Search by borrowerId or applicationId' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
