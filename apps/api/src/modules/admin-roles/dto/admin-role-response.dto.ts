import { ApiProperty } from '@nestjs/swagger';

class RolePermissionDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class AdminRoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({ type: [RolePermissionDto] })
  permissions!: RolePermissionDto[];
}
