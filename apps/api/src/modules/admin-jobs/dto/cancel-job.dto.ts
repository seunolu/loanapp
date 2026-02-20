import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelJobDto {
  @ApiPropertyOptional({ default: 'Cancelled by admin' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

