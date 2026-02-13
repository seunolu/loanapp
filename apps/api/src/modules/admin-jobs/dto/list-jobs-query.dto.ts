import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';
import { CursorPaginationQueryDto } from '../../../common/pagination/dto/cursor-pagination-query.dto';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListJobsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Search by type/key' })
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
