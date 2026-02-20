import { ApiProperty } from '@nestjs/swagger';

class LoanProductFeeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['FIXED', 'PERCENT_OF_PRINCIPAL'] })
  type!: 'FIXED' | 'PERCENT_OF_PRINCIPAL';

  @ApiProperty()
  amount!: number;

  @ApiProperty({ enum: ['UPFRONT', 'PER_INSTALLMENT', 'END'] })
  applyAt!: 'UPFRONT' | 'PER_INSTALLMENT' | 'END';

  @ApiProperty()
  createdAt!: string;
}

class OfferInstallmentDto {
  @ApiProperty()
  installmentNo!: number;

  @ApiProperty()
  dueDate!: string;

  @ApiProperty()
  principal!: number;

  @ApiProperty()
  interest!: number;

  @ApiProperty()
  fees!: number;

  @ApiProperty()
  total!: number;
}

export class LoanProductDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] })
  status!: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  minPrincipal!: number;

  @ApiProperty()
  maxPrincipal!: number;

  @ApiProperty()
  minTenorDays!: number;

  @ApiProperty()
  maxTenorDays!: number;

  @ApiProperty({ enum: ['FLAT', 'REDUCING'] })
  interestType!: 'FLAT' | 'REDUCING';

  @ApiProperty()
  interestRateBps!: number;

  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] })
  repaymentFrequency!: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

  @ApiProperty()
  graceDays!: number;

  @ApiProperty()
  allowEarlyRepayment!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [LoanProductFeeDto] })
  fees!: LoanProductFeeDto[];
}

export class ListLoanProductsResponseDto {
  @ApiProperty({ type: [LoanProductDto] })
  items!: LoanProductDto[];
}

export class ComputeOfferResponseDto {
  @ApiProperty({ type: [OfferInstallmentDto] })
  schedule!: OfferInstallmentDto[];

  @ApiProperty()
  totals!: {
    principal: number;
    interest: number;
    fees: number;
    total: number;
  };

  @ApiProperty()
  effectiveAprBps!: number;

  @ApiProperty()
  productSnapshot!: unknown;
}
