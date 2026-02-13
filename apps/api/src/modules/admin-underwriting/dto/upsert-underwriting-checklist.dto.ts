import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ChecklistInputItemDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ enum: ['PENDING', 'PASSED', 'FAILED'] })
  @IsIn(['PENDING', 'PASSED', 'FAILED'])
  status!: 'PENDING' | 'PASSED' | 'FAILED';

  @ApiProperty({ default: true })
  @IsBoolean()
  isRequired!: boolean;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpsertUnderwritingChecklistDto {
  @ApiProperty({ type: [ChecklistInputItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistInputItemDto)
  items!: ChecklistInputItemDto[];
}

