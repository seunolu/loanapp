import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class SummaryQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  asOf?: string;
}

export class PortfolioQueryDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  from!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  to!: string;
}

export class CollectionsQueryDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  from!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  daily?: boolean;
}

export class ParQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  asOf?: string;
}
