import { ApiProperty } from '@nestjs/swagger';

class DependencyHealthDto {
  @ApiProperty({ example: 'up' })
  status!: 'up' | 'down';
}

export class AdminHealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ type: DependencyHealthDto })
  database!: DependencyHealthDto;

  @ApiProperty({ type: DependencyHealthDto })
  redis!: DependencyHealthDto;
}
