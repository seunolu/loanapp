import { ApiProperty } from '@nestjs/swagger';

class PlatformOwnerSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['OWNER', 'SUPER_ADMIN'] })
  role!: 'OWNER' | 'SUPER_ADMIN';
}

export class PlatformLenderDetailsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['PENDING', 'COMPLETED'] })
  onboardingStatus!: 'PENDING' | 'COMPLETED';

  @ApiProperty({ nullable: true })
  onboardedAt!: string | null;

  @ApiProperty({ nullable: true, type: PlatformOwnerSummaryDto })
  ownerAdmin!: PlatformOwnerSummaryDto | null;
}

