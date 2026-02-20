import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';

export class ListAdminAuditsQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ['BORROWER', 'TENANT_ADMIN', 'SYSTEM'] })
  @IsOptional()
  @IsIn(['BORROWER', 'TENANT_ADMIN', 'SYSTEM'])
  actorType?: 'BORROWER' | 'TENANT_ADMIN' | 'SYSTEM';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: ['SUCCESS', 'FAIL'] })
  @IsOptional()
  @IsIn(['SUCCESS', 'FAIL'])
  status?: 'SUCCESS' | 'FAIL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @ApiPropertyOptional({ default: '-createdAt', enum: ['createdAt', '-createdAt', 'action', '-action'] })
  @IsOptional()
  @IsIn(['createdAt', '-createdAt', 'action', '-action'])
  sort: 'createdAt' | '-createdAt' | 'action' | '-action' = '-createdAt';
}
