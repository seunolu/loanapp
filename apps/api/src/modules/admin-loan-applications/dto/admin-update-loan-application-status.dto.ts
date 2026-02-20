import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AdminUpdateLoanApplicationStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
