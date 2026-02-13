import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class MarkFailedDisbursementDto {
  @ApiProperty({ example: 'Bank transfer failed due to timeout.' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
