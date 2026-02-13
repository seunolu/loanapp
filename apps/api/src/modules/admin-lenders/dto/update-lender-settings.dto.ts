import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateLenderSettingsDto {
  @ApiProperty({ type: Object })
  @IsObject()
  settings!: Record<string, unknown>;
}

