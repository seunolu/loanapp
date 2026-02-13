import { ApiProperty } from '@nestjs/swagger';

export class BorrowerNoteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  borrowerId!: string;

  @ApiProperty()
  note!: string;

  @ApiProperty()
  createdById!: string;

  @ApiProperty()
  createdAt!: string;
}

