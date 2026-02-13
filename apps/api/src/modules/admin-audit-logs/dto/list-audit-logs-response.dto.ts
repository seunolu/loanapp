import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional({ nullable: true })
  actorType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  actorId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  entityType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  entityId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  requestId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

export class ListAuditLogsResponseDto {
  @ApiProperty({ type: [AuditLogListItemDto] })
  items!: AuditLogListItemDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

