import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreatePlatformLenderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'acme-lender' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiProperty()
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  ownerName!: string;

  @ApiProperty({ enum: ['OWNER', 'SUPER_ADMIN'], default: 'OWNER' })
  @IsOptional()
  @IsIn(['OWNER', 'SUPER_ADMIN'])
  ownerRole?: 'OWNER' | 'SUPER_ADMIN';
}

