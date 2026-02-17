import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class AdminListLoanApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'DISBURSED'] })
  @IsOptional()
  @IsIn(['SUBMITTED', 'APPROVED', 'REJECTED', 'DISBURSED'])
  status?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
}

