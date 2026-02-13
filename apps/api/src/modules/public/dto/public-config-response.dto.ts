import { ApiProperty } from '@nestjs/swagger';

class PublicBrandingDto {
  @ApiProperty()
  displayName!: string;

  @ApiProperty({ nullable: true })
  logoUrl!: string | null;

  @ApiProperty()
  primaryColor!: string;
}

class PublicPolicyDto {
  @ApiProperty()
  minLoanAmountKobo!: number;

  @ApiProperty()
  maxLoanAmountKobo!: number;

  @ApiProperty()
  minTenorDays!: number;

  @ApiProperty()
  maxTenorDays!: number;
}

class PublicSupportDto {
  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  whatsapp!: string | null;
}

class PublicFeaturesDto {
  @ApiProperty()
  maintenanceMode!: boolean;

  @ApiProperty()
  enableOtpSms!: boolean;
}

export class PublicConfigResponseDto {
  @ApiProperty()
  lenderId!: string;

  @ApiProperty()
  lenderSlug!: string;

  @ApiProperty({ type: PublicBrandingDto })
  branding!: PublicBrandingDto;

  @ApiProperty({ type: PublicPolicyDto })
  policy!: PublicPolicyDto;

  @ApiProperty({ type: PublicSupportDto })
  support!: PublicSupportDto;

  @ApiProperty({ type: PublicFeaturesDto })
  features!: PublicFeaturesDto;
}

