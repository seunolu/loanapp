import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBorrower } from '../../common/auth/current-borrower.decorator';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { BorrowerAuthGuard } from '../auth/guards/borrower-auth.guard';
import { CompleteFileDto } from './dto/complete-file.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { UploadUrlDto } from './dto/upload-url.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth('bearer')
@Controller('files')
@UseGuards(BorrowerAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a stub upload URL and create file metadata row' })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  async issueUploadUrl(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: UploadUrlDto
  ): Promise<UploadUrlResponseDto> {
    return this.filesService.issueUploadUrl(borrower, body);
  }

  @Post('complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark file upload as confirmed' })
  @ApiNoContentResponse()
  async complete(
    @CurrentBorrower() borrower: BorrowerPrincipal,
    @Body() body: CompleteFileDto
  ): Promise<void> {
    await this.filesService.completeUpload(borrower, body);
  }
}
