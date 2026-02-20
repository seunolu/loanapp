import { ApiProperty } from '@nestjs/swagger';
import { JobStatus, JobType } from '@prisma/client';

export class JobItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: JobType })
  type!: JobType;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ nullable: true })
  lenderId!: string | null;

  @ApiProperty({ nullable: true })
  dedupeKey!: string | null;

  @ApiProperty({ type: Object })
  payload!: Record<string, unknown>;

  @ApiProperty()
  attempts!: number;

  @ApiProperty()
  maxAttempts!: number;

  @ApiProperty({ format: 'date-time' })
  runAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  lockedAt!: string | null;

  @ApiProperty({ nullable: true })
  lockedBy!: string | null;

  @ApiProperty({ nullable: true })
  lastError!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  succeededAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  failedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
