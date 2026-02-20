import { ApiProperty } from '@nestjs/swagger';
import { JobItemDto } from './job-item.dto';

export class ListJobsResponseDto {
  @ApiProperty({ type: [JobItemDto] })
  items!: JobItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
