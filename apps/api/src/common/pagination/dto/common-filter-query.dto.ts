import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CommonFilterQueryDto {
  @ApiPropertyOptional({ description: 'Free-text query filter' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Created-at start (inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Created-at end (inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

