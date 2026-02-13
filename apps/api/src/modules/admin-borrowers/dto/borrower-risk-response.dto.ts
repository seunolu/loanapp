import { ApiProperty } from '@nestjs/swagger';

class BorrowerRiskProfileDto {
  @ApiProperty()
  score!: number;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  level!: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({ nullable: true })
  lastEvaluatedAt!: string | null;
}

class BorrowerRiskEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  scoreDelta!: number;

  @ApiProperty()
  totalScore!: number;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  level!: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty()
  blocked!: boolean;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty()
  createdAt!: string;
}

class BorrowerRiskDeviceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  deviceId!: string;

  @ApiProperty({ nullable: true })
  ip!: string | null;

  @ApiProperty({ nullable: true })
  userAgent!: string | null;

  @ApiProperty()
  lastSeenAt!: string;
}

export class BorrowerRiskResponseDto {
  @ApiProperty()
  borrowerId!: string;

  @ApiProperty({ type: BorrowerRiskProfileDto, nullable: true })
  profile!: BorrowerRiskProfileDto | null;

  @ApiProperty({ type: [BorrowerRiskEventDto] })
  events!: BorrowerRiskEventDto[];

  @ApiProperty({ type: [BorrowerRiskDeviceDto] })
  devices!: BorrowerRiskDeviceDto[];
}
