import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AdminRefreshDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
