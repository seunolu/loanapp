import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@loanapp.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'demo' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  tenantSlug?: string;

  @ApiPropertyOptional({ example: 'cmtenant001' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  tenantId?: string;
}
