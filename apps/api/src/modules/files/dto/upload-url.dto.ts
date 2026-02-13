import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class UploadUrlDto {
  @ApiProperty({ example: 'national-id-front.jpg' })
  @IsString()
  @Matches(/^[^\\/]+$/, { message: 'fileName must not contain path separators' })
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 245760 })
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  sizeBytes!: number;

  @ApiProperty({ example: 'KYC_DOCUMENT' })
  @IsString()
  purpose!: string;
}
