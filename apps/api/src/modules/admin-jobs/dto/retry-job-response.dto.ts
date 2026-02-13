import { ApiProperty } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';

export class RetryJobResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;
}
