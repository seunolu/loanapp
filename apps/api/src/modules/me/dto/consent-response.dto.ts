import { ApiProperty } from '@nestjs/swagger';

export class ConsentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  version!: string;

  @ApiProperty({ format: 'date-time' })
  acceptedAt!: string;
}
