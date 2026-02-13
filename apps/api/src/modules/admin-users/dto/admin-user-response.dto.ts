import { ApiProperty } from '@nestjs/swagger';

export class AdminUserItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  lenderId!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['PLATFORM_SUPER_ADMIN', 'OWNER', 'SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER'] })
  role!: string;

  @ApiProperty({ nullable: true })
  assignedRoleId!: string | null;

  @ApiProperty({ nullable: true })
  assignedRoleName!: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  status!: 'ACTIVE' | 'SUSPENDED';

  @ApiProperty({ nullable: true })
  lastLoginAt!: string | null;

  @ApiProperty({ nullable: true })
  lastLoginIp!: string | null;

  @ApiProperty({ nullable: true })
  lastUserAgent!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AdminUserListResponseDto {
  @ApiProperty({ type: [AdminUserItemDto] })
  items!: AdminUserItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}

export class CreateAdminUserResponseDto {
  @ApiProperty({ type: AdminUserItemDto })
  admin!: AdminUserItemDto;

  @ApiProperty()
  inviteToken!: string;

  @ApiProperty()
  inviteLink!: string;

  @ApiProperty()
  inviteExpiresAt!: string;
}
