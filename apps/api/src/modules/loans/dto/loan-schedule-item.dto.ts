import { ApiProperty } from '@nestjs/swagger';
import { RepaymentScheduleItemStatus } from '@prisma/client';

export class LoanScheduleItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'date-time' })
  dueDate!: string;

  @ApiProperty({ example: 850000 })
  amount!: number;

  @ApiProperty({ example: 250000 })
  paidAmountKobo!: number;

  @ApiProperty({ enum: RepaymentScheduleItemStatus })
  status!: RepaymentScheduleItemStatus;

  @ApiProperty({ format: 'date-time', nullable: true })
  paidAt!: string | null;
}
