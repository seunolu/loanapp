import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateAdminUserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}
