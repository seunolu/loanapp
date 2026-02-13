import { ApiProperty } from '@nestjs/swagger';
import { JobStatus, JobType } from '@prisma/client';

export class JobItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: JobType })
  type!: JobType;

  @ApiProperty()
  key!: string;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiProperty()
  attempts!: number;

  @ApiProperty()
  maxAttempts!: number;

  @ApiProperty({ format: 'date-time' })
  runAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  lockedAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  deadAt!: string | null;

  @ApiProperty({ nullable: true })
  lastError!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
