import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AccruePenaltyDto {
  @ApiPropertyOptional({
    description: 'Accrual date in ISO format. Defaults to current date (UTC).',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString()
  accrualDate?: string;
}
