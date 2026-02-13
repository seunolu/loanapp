import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class CreateLenderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Lowercase URL-safe slug', example: 'lender-acme' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

