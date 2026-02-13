import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlResponseDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty({ example: 900 })
  expiresInSec!: number;
}
