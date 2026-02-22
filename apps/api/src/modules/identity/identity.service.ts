import { createHash } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { AuditService } from '../../common/audit/audit.service';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { compareNames } from './name-match.util';
import { BVN_PROVIDER, type BvnProvider } from './providers/bvn.provider';
import { IdentityRiskService } from './identity-risk.service';

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    private readonly requestContext: RequestContextService,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
    private readonly identityRiskService: IdentityRiskService,
    @Inject(BVN_PROVIDER) private readonly bvnProvider: BvnProvider
  ) {}

  async recordConsent(principal: BorrowerPrincipal, input: { type: string }) {
    const userConsent = (this.prisma as any).userConsent;
    const ctx = this.requestContext.get();
    const consent = await userConsent.create({
      data: {
        lenderId: principal.lenderId,
        userId: principal.borrowerId,
        type: input.type,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent
      }
    });

    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      action: 'IDENTITY_CONSENT_RECORDED',
      entity: 'USER_CONSENT',
      entityId: consent.id,
      metadata: { type: input.type }
    });

    return {
      id: consent.id,
      type: consent.type,
      acceptedAt: consent.acceptedAt.toISOString()
    };
  }

  async verifyBvn(principal: BorrowerPrincipal, input: { bvn: string }) {
    const userConsent = (this.prisma as any).userConsent;
    const identityVerification = (this.prisma as any).identityVerification;
    await this.enforceRateLimit(principal, this.requestContext.get().ip);

    const hasConsent = await userConsent.findFirst({
      where: {
        lenderId: principal.lenderId,
        userId: principal.borrowerId,
        type: 'KYC_CONSENT'
      },
      select: { id: true }
    });
    if (!hasConsent) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'KYC consent is required before BVN verification.',
        details: null
      });
    }

    const borrower = await this.prisma.borrower.findFirst({
      where: { id: principal.borrowerId, lenderId: principal.lenderId },
      include: { profile: true }
    });
    if (!borrower) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Borrower record not found.',
        details: null
      });
    }

    const bvnHash = createHash('sha256').update(input.bvn).digest('hex');

    let status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW' = 'FAILED';
    let verifiedName: string | null = null;
    let verifiedDob: Date | null = null;
    let similarity = 0;
    let riskScore = 100;
    let flags: string[] = ['PROVIDER_ERROR'];
    const provider = 'NIBSS';

    try {
      const providerResult = await this.bvnProvider.verify(input.bvn);
      verifiedName = providerResult.fullName;
      verifiedDob = new Date(providerResult.dob);

      const borrowerName = `${borrower.profile?.firstName ?? ''} ${borrower.profile?.lastName ?? ''}`.trim();
      const nameMatch = compareNames(borrowerName, providerResult.fullName);
      similarity = nameMatch.similarity;

      const risk = await this.identityRiskService.evaluate({
        lenderId: principal.lenderId,
        userId: principal.borrowerId,
        bvnHash,
        nameSimilarity: similarity,
        borrowerDob: borrower.profile?.dateOfBirth ?? null,
        verifiedDob
      });
      riskScore = risk.riskScore;
      flags = risk.flags;

      if (similarity >= 0.85 && flags.length === 0) {
        status = 'VERIFIED';
      } else if (similarity >= 0.65) {
        status = 'MANUAL_REVIEW';
      } else {
        status = 'FAILED';
      }
    } catch {
      status = 'FAILED';
    }

    const row = await identityVerification.create({
      data: {
        lenderId: principal.lenderId,
        userId: principal.borrowerId,
        provider,
        bvnHash,
        verifiedName,
        verifiedDob,
        verificationStatus: status,
        matchScore: similarity,
        riskFlags: { riskScore, flags }
      }
    });

    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      action: 'IDENTITY_BVN_VERIFICATION_ATTEMPT',
      entity: 'IDENTITY_VERIFICATION',
      entityId: row.id,
      metadata: {
        provider,
        status,
        matchScore: similarity,
        riskScore,
        flags
      }
    });

    return this.toPublicVerification(row);
  }

  async getStatus(principal: BorrowerPrincipal) {
    const identityVerification = (this.prisma as any).identityVerification;
    const latest = await identityVerification.findFirst({
      where: {
        lenderId: principal.lenderId,
        userId: principal.borrowerId
      },
      orderBy: { createdAt: 'desc' }
    });
    return latest ? this.toPublicVerification(latest) : null;
  }

  async getLoanIdentitySummary(principal: TenantAdminPrincipal, loanId: string) {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanId, tenantId: principal.tenantId },
      select: { id: true, phone: true }
    });
    if (!loan) return null;

    const borrower = await this.prisma.borrower.findFirst({
      where: { lenderId: principal.tenantId, phone: loan.phone },
      select: { id: true }
    });
    if (!borrower) return null;

    const identityVerification = (this.prisma as any).identityVerification;
    const latest = await identityVerification.findFirst({
      where: { lenderId: principal.tenantId, userId: borrower.id },
      orderBy: { createdAt: 'desc' }
    });
    if (!latest) return null;
    return this.toPublicVerification(latest);
  }

  async approveManualReview(principal: TenantAdminPrincipal, loanId: string) {
    if (principal.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only SUPER_ADMIN can approve manual KYC review.',
        details: null
      });
    }

    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanId, tenantId: principal.tenantId },
      select: { phone: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: null
      });
    }

    const borrower = await this.prisma.borrower.findFirst({
      where: { lenderId: principal.tenantId, phone: loan.phone },
      select: { id: true }
    });
    if (!borrower) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Borrower not found for loan.',
        details: null
      });
    }

    const identityVerification = (this.prisma as any).identityVerification;
    const latest = await identityVerification.findFirst({
      where: { lenderId: principal.tenantId, userId: borrower.id },
      orderBy: { createdAt: 'desc' }
    });
    if (!latest || latest.verificationStatus !== 'MANUAL_REVIEW') {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'No MANUAL_REVIEW identity verification found.',
        details: null
      });
    }

    const updated = await identityVerification.update({
      where: { id: latest.id },
      data: { verificationStatus: 'VERIFIED' }
    });

    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'IDENTITY_MANUAL_REVIEW_APPROVED',
      entity: 'IDENTITY_VERIFICATION',
      entityId: updated.id,
      metadata: { loanId }
    });

    return this.toPublicVerification(updated);
  }

  private toPublicVerification(row: {
    id: string;
    provider: string;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';
    matchScore: number | null;
    riskFlags: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      provider: row.provider,
      status: row.verificationStatus,
      matchScore: row.matchScore,
      riskFlags: row.riskFlags ?? { riskScore: 0, flags: [] },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private async enforceRateLimit(principal: BorrowerPrincipal, ip: string | null): Promise<void> {
    if (!ip) return;
    const windowSec = this.configService.get('IDENTITY_VERIFY_RATE_LIMIT_IP_WINDOW_SEC', { infer: true });
    const max = this.configService.get('IDENTITY_VERIFY_RATE_LIMIT_IP_MAX', { infer: true });
    const key = `rl:identity:bvn:${principal.tenantId}:${principal.borrowerId}:${ip}`;
    const count = await this.redisService.incrementWithWindow(key, windowSec);
    if (count > max) {
      throw new ForbiddenException({
        code: 'RATE_LIMITED',
        message: 'Too many verification attempts. Please try again later.',
        details: null
      });
    }
  }
}
