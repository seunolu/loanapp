import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveTenantResponseDto {
  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  lenderTitle?: string;

  @ApiPropertyOptional()
  apiBaseUrl?: string;

  @ApiPropertyOptional({ type: Object })
  theme?: Record<string, unknown>;
}
