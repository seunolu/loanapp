import { ApiProperty } from '@nestjs/swagger';
import { AdminLoanApplicationDetailsDto } from './admin-loan-application-details.dto';

class AdminLoanApplicationListItemDto {
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

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  tenorMonths!: number;

  @ApiProperty()
  createdAt!: string;
}

export class AdminListLoanApplicationsResponseDto {
  @ApiProperty({ type: [AdminLoanApplicationListItemDto] })
  items!: Array<
    Pick<
      AdminLoanApplicationDetailsDto,
      'id' | 'tenantId' | 'status' | 'fullName' | 'phone' | 'amount' | 'tenorMonths' | 'createdAt'
    >
  >;
}

