import { ApiProperty } from '@nestjs/swagger';
import { AdminLoanApplicationEventDto } from './admin-loan-application-event.dto';

export class AdminLoanApplicationDetailsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'] })
  status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  dob!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  tenorMonths!: number;

  @ApiProperty({ nullable: true })
  purpose!: string | null;

  @ApiProperty({ nullable: true })
  employmentStatus!: string | null;

  @ApiProperty({ nullable: true })
  incomeBand!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [AdminLoanApplicationEventDto] })
  events!: AdminLoanApplicationEventDto[];
}

