import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationQueryDto } from '../../../common/pagination/dto/cursor-pagination-query.dto';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class ListUnderwritingCasesQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED'] })
  @IsOptional()
  @IsIn(['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED'])
  status?: 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';

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
