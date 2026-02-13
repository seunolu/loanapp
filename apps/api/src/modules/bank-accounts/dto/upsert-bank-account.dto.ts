import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpsertBankAccountDto {
  @ApiProperty({ example: '058' })
  @IsString()
  @Length(2, 10)
  bankCode!: string;

  @ApiProperty({ example: 'Guaranty Trust Bank' })
  @IsString()
  @Length(2, 120)
  bankName!: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @Matches(/^\d{10}$/)
  accountNumber!: string;

  @ApiProperty({ example: 'Ada Okafor' })
  @IsString()
  @Length(2, 160)
  accountName!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
