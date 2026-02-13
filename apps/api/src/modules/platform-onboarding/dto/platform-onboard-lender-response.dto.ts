import { ApiProperty } from '@nestjs/swagger';

class OnboardedOwnerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['OWNER', 'SUPER_ADMIN'] })
  role!: 'OWNER' | 'SUPER_ADMIN';
}

export class PlatformOnboardLenderResponseDto {
  @ApiProperty()
  lenderId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  onboardingStatus!: 'COMPLETED';

  @ApiProperty({ type: OnboardedOwnerDto })
  ownerAdmin!: OnboardedOwnerDto;

  @ApiProperty()
  inviteToken!: string;

  @ApiProperty()
  inviteLink!: string;

  @ApiProperty()
  inviteExpiresAt!: string;
}

