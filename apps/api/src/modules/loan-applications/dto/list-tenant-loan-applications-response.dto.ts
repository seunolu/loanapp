import { ApiProperty } from '@nestjs/swagger';
import { TenantLoanApplicationSummaryDto } from './tenant-loan-application-summary.dto';

export class ListTenantLoanApplicationsResponseDto {
  @ApiProperty({ type: [TenantLoanApplicationSummaryDto] })
  items!: TenantLoanApplicationSummaryDto[];
}

