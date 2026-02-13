import { ApiProperty } from '@nestjs/swagger';

export class LenderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  status!: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ type: Object, nullable: true })
  settings!: Record<string, unknown> | null;
}

