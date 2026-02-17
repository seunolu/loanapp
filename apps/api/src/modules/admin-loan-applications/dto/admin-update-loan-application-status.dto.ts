import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AdminUpdateLoanApplicationStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'DISBURSED'] })
  @IsString()
  @IsIn(['APPROVED', 'REJECTED', 'DISBURSED'])
  status!: 'APPROVED' | 'REJECTED' | 'DISBURSED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

