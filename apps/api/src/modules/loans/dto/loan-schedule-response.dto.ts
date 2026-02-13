import { ApiProperty } from '@nestjs/swagger';
import { LoanScheduleItemDto } from './loan-schedule-item.dto';

export class LoanScheduleResponseDto {
  @ApiProperty()
  loanId!: string;

  @ApiProperty({ type: [LoanScheduleItemDto] })
  items!: LoanScheduleItemDto[];
}
