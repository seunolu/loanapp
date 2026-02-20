import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListDisbursementsQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED'] })
  @IsOptional()
  @IsIn(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED'])
  status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}
