import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddBorrowerNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note!: string;
}

