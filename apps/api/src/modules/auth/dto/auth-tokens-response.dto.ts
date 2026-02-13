import { ApiProperty } from '@nestjs/swagger';

export class AuthBorrowerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lenderId!: string;

  @ApiProperty()
  phone!: string;
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthBorrowerDto })
  borrower!: AuthBorrowerDto;
}
