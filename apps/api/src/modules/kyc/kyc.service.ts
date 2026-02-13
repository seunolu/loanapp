import { BadRequestException, Injectable, Scope } from '@nestjs/common';
import { FileStatus, KycCaseStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { PrismaService } from '../../common/database/prisma.service';
import type { KycStatusResponseDto } from './dto/kyc-status-response.dto';
import type { KycSubmitResponseDto } from './dto/kyc-submit-response.dto';
import type { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable({ scope: Scope.REQUEST })
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async submit(principal: BorrowerPrincipal, input: SubmitKycDto): Promise<KycSubmitResponseDto> {
    const borrower = await this.prisma.borrower.findUnique({
      where: { id: principal.borrowerId },
      include: { profile: true }
    });

    if (!borrower || borrower.lenderId !== principal.lenderId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid borrower context.',
        details: null
      });
    }

    if (!borrower.profile) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Borrower profile must be completed before KYC submission.',
        details: {
          field: 'profile'
        }
      });
    }

    const uniqueFileIds = [...new Set(input.documentFileIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueFileIds.length === 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'At least one document fileId is required.',
        details: {
          field: 'documentFileIds'
        }
      });
    }

    const files = await this.prisma.file.findMany({
      where: {
        id: { in: uniqueFileIds }
      }
    });

    if (files.length !== uniqueFileIds.length) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'One or more documents do not exist.',
        details: {
          field: 'documentFileIds'
        }
      });
    }

    for (const file of files) {
      if (file.borrowerId !== principal.borrowerId) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'All documents must belong to the authenticated borrower.',
          details: {
            fileId: file.id
          }
        });
      }

      if (file.status !== FileStatus.CONFIRMED) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'All documents must be confirmed before KYC submission.',
          details: {
            fileId: file.id
          }
        });
      }

      if (file.purpose !== 'KYC_DOCUMENT') {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'All documents must have purpose KYC_DOCUMENT.',
          details: {
            fileId: file.id
          }
        });
      }
    }

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const kycCase = await tx.kycCase.upsert({
        where: { borrowerId: principal.borrowerId },
        update: {
          status: KycCaseStatus.PENDING,
          submittedAt: now
        },
        create: {
          lenderId: principal.lenderId,
          borrowerId: principal.borrowerId,
          status: KycCaseStatus.PENDING,
          submittedAt: now
        }
      });

      await tx.kycDocument.deleteMany({ where: { kycCaseId: kycCase.id } });
      await tx.kycDocument.createMany({
        data: uniqueFileIds.map((fileId) => ({
          kycCaseId: kycCase.id,
          fileId
        }))
      });

      return kycCase;
    });

    await this.auditService.write({
      event: 'KYC_SUBMITTED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        entityType: 'KYC_CASE',
        entityId: result.id,
        documentCount: uniqueFileIds.length
      }
    });

    return {
      kycCaseId: result.id,
      status: result.status,
      submittedAt: result.submittedAt ? result.submittedAt.toISOString() : null
    };
  }

  async status(principal: BorrowerPrincipal): Promise<KycStatusResponseDto> {
    const kycCase = await this.prisma.kycCase.findUnique({
      where: { borrowerId: principal.borrowerId }
    });

    if (!kycCase || kycCase.lenderId !== principal.lenderId) {
      return {
        status: 'NOT_SUBMITTED',
        lastUpdatedAt: null
      };
    }

    return {
      status: kycCase.status,
      lastUpdatedAt: kycCase.updatedAt.toISOString()
    };
  }
}
