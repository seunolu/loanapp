import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class AcceptConsentDto {
  @ApiProperty({ example: 'TERMS_AND_PRIVACY' })
  @IsString()
  @MinLength(1)
  type!: string;

  @ApiProperty({ example: 'v1.0' })
  @IsString()
  @MinLength(1)
  version!: string;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
