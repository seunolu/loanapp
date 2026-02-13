import { ApiProperty } from '@nestjs/swagger';
import { PenaltyAccrualDto } from './penalty-accrual.dto';

export class AccruePenaltyResponseDto {
  @ApiProperty()
  created!: boolean;

  @ApiProperty({ type: PenaltyAccrualDto })
  accrual!: PenaltyAccrualDto;
}
