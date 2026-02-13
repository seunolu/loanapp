import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminSetupPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(16)
  token!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  newPassword!: string;
}
