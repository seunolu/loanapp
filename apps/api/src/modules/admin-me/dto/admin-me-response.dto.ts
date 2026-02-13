import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole, AdminStatus, LenderStatus } from '@prisma/client';
import type { PermissionCode } from '../../../common/rbac/permissions.constants';

class AdminMeAdminDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  fullName!: string | null;

  @ApiProperty({ enum: AdminStatus })
  status!: AdminStatus;

  @ApiProperty({ enum: AdminRole })
  role!: AdminRole;

  @ApiPropertyOptional({ nullable: true })
  roleId!: string | null;
}

class AdminMeLenderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: LenderStatus })
  status!: LenderStatus;
}

export class AdminMeResponseDto {
  @ApiProperty({ type: AdminMeAdminDto })
  admin!: AdminMeAdminDto;

  @ApiPropertyOptional({ type: AdminMeLenderDto, nullable: true })
  lender!: AdminMeLenderDto | null;

  @ApiProperty({ isArray: true, type: String })
  permissions!: PermissionCode[];
}
