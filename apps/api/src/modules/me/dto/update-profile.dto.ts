import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: '2000-05-01' })
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
