import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  revokeAllForDevice?: boolean;
}
