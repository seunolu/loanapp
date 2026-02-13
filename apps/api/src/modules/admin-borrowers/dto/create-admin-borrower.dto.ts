import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateAdminBorrowerDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @Matches(/^\+\d{10,15}$/)
  phone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: '1995-04-10' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;
}

