import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class ResolveTenantQueryDto {
  @ApiProperty({ example: 'demo' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiPropertyOptional({ example: 'Demo' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lenderTitle?: string;
}

