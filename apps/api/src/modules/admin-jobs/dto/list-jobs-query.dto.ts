import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const JOB_STATUS_FILTERS = ['PENDING', 'PROCESSING', 'FAILED', 'DLQ', 'SUCCEEDED'] as const;
export type JobStatusFilter = (typeof JOB_STATUS_FILTERS)[number];

export class ListJobsQueryDto {
  @ApiPropertyOptional({ enum: JOB_STATUS_FILTERS })
  @IsOptional()
  @IsEnum(JOB_STATUS_FILTERS)
  status?: JobStatusFilter;

  @ApiPropertyOptional({ enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional({ description: 'Search by type/key' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Search text alias' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Tenant filter (cross-tenant not allowed for tenant admins)' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Opaque cursor from previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
