import { ApiProperty } from '@nestjs/swagger';
import { PenaltyAccrualDto } from './penalty-accrual.dto';

export class ListPenaltiesResponseDto {
  @ApiProperty()
  loanId!: string;

  @ApiProperty({ type: [PenaltyAccrualDto] })
  items!: PenaltyAccrualDto[];
}
