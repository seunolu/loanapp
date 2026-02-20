import { ApiProperty } from '@nestjs/swagger';
import type { AdminRoleName } from '../../../common/auth/admin-principal';

export class AdminDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  lenderId!: string | null;

  @ApiProperty({ nullable: true })
  tenantId!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({
    enum: [
      'PLATFORM_SUPER_ADMIN',
      'OWNER',
      'SUPER_ADMIN',
      'OPS',
      'FINANCE',
      'VIEWER',
      'CREDIT_OFFICER',
      'RISK_MANAGER',
      'COLLECTIONS',
      'SYSTEM',
      'TENANT_ADMIN'
    ]
  })
  role!: AdminRoleName;
}

export class AdminAuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AdminDto })
  admin!: AdminDto;
}
