import { ApiProperty } from '@nestjs/swagger';
import type { AdminRoleName } from '../../../common/auth/admin-principal';

class InviteAdminSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['PLATFORM_SUPER_ADMIN', 'OWNER', 'SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER'] })
  role!: AdminRoleName;
}

class InviteLenderSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class AdminInviteValidateResponseDto {
  @ApiProperty()
  valid!: true;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ type: InviteAdminSummaryDto })
  admin!: InviteAdminSummaryDto;

  @ApiProperty({ type: InviteLenderSummaryDto })
  lender!: InviteLenderSummaryDto;
}
