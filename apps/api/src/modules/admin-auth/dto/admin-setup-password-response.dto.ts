import { ApiProperty } from '@nestjs/swagger';

export class AdminSetupPasswordResponseDto {
  @ApiProperty()
  ok!: true;
}
