import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min
} from 'class-validator';

export class CreateTenantLoanApplicationDto {
  @ApiProperty({ example: 'Ada Okafor' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/)
  phone!: string;

  @ApiPropertyOptional({ example: 'ada@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '1994-11-10' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dob?: string;

  @ApiPropertyOptional({ example: 'Lekki, Lagos' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  tenorMonths!: number;

  @ApiPropertyOptional({ example: 'Business expansion' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  purpose?: string;

  @ApiPropertyOptional({ example: 'EMPLOYED' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  employmentStatus?: string;

  @ApiPropertyOptional({ example: '200k-500k' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  incomeBand?: string;
}

