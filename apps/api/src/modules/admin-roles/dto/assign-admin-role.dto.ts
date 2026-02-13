import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AssignAdminRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  roleId!: string;
}
