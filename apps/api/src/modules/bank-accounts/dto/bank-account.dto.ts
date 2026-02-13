import { ApiProperty } from '@nestjs/swagger';

export class BankAccountDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bankCode!: string;

  @ApiProperty()
  bankName!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  accountName!: string;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
