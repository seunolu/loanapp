import { ForbiddenException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { FileStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import type { CompleteFileDto } from './dto/complete-file.dto';
import type { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import type { UploadUrlDto } from './dto/upload-url.dto';

@Injectable({ scope: Scope.REQUEST })
export class FilesService {
  private readonly uploadUrlExpiresInSec = 900;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly requestContextService: RequestContextService
  ) {}

  async issueUploadUrl(principal: BorrowerPrincipal, input: UploadUrlDto): Promise<UploadUrlResponseDto> {
    const safeName = input.fileName.trim();
    const purpose = input.purpose.trim();

    const seed = `${principal.borrowerId}/${Date.now()}/${safeName}`;
    const storageKey = `borrowers/${principal.borrowerId}/${Buffer.from(seed).toString('base64url')}`;

    const created = await this.prisma.file.create({
      data: {
        borrowerId: principal.borrowerId,
        fileName: safeName,
        mimeType: input.mimeType.trim(),
        sizeBytes: input.sizeBytes,
        purpose,
        storageKey,
        status: FileStatus.PENDING
      }
    });

    const uploadUrl = `https://upload.stub.local/${encodeURIComponent(created.storageKey)}`;

    await this.auditService.write({
      event: 'FILE_UPLOAD_URL_ISSUED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        fileId: created.id,
        storageKey: created.storageKey,
        purpose,
        ip: this.requestContextService.get().ip,
        userAgent: this.requestContextService.get().userAgent
      }
    });

    return {
      fileId: created.id,
      uploadUrl,
      expiresInSec: this.uploadUrlExpiresInSec
    };
  }

  async completeUpload(principal: BorrowerPrincipal, input: CompleteFileDto): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id: input.fileId } });

    if (!file) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'File not found.',
        details: null
      });
    }

    if (file.borrowerId !== principal.borrowerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not own this file.',
        details: null
      });
    }

    if (file.status !== FileStatus.CONFIRMED) {
      await this.prisma.file.update({
        where: { id: file.id },
        data: {
          status: FileStatus.CONFIRMED,
          confirmedAt: new Date()
        }
      });
    }

    await this.auditService.write({
      event: 'FILE_CONFIRMED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        fileId: file.id,
        storageKey: file.storageKey
      }
    });
  }
}
