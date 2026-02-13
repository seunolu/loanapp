import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationQueryDto } from '../../../common/pagination/dto/cursor-pagination-query.dto';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class ListAuditLogsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Free-text query over action/actor/entity/requestId' })
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

  @ApiPropertyOptional({ enum: ['none', 'details'], default: 'none' })
  @IsOptional()
  @IsIn(['none', 'details'])
  include?: 'none' | 'details';

  @ApiPropertyOptional({ description: 'Optional explicit lender scope (platform admins)' })
  @IsOptional()
  @IsString()
  lenderId?: string;
}

