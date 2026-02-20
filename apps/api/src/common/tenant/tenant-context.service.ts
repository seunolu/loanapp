import { BadRequestException, ForbiddenException, Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { LenderStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import type { RequestWithId } from '../types/request-with-id';

type UserWithLender = {
  lenderId?: string;
  tenantId?: string;
};

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private cachedLender: { id: string; status: LenderStatus } | null = null;
  private cachedTenantId: string | null = null;

  constructor(
    @Inject(REQUEST) private readonly request: RequestWithId,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async requireAnonymousLenderId(): Promise<string> {
    const lenderIdHeader = this.request.header('x-lender-id');
    const lenderId = typeof lenderIdHeader === 'string' ? lenderIdHeader.trim() : '';

    if (!lenderId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'X-Lender-Id header is required.',
        details: { header: 'X-Lender-Id' }
      });
    }

    const lender = await this.getLender(lenderId);
    if (!lender || lender.status !== LenderStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid lender context.',
        details: null
      });
    }

    return lender.id;
  }

  async resolveOptionalAnonymousLenderId(): Promise<string | null> {
    const lenderIdHeader = this.request.header('x-lender-id');
    const lenderId = typeof lenderIdHeader === 'string' ? lenderIdHeader.trim() : '';
    if (!lenderId) {
      return null;
    }

    const lender = await this.getLender(lenderId);
    if (!lender || lender.status !== LenderStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid lender context.',
        details: null
      });
    }

    return lender.id;
  }

  async requireTenantId(): Promise<string> {
    const user = this.request.user as UserWithLender | undefined;
    if (user?.lenderId) {
      return user.lenderId;
    }
    return this.requireAnonymousLenderId();
  }

  async requireResolvedTenantId(): Promise<string> {
    const user = this.request.user as UserWithLender | undefined;
    const jwtTenantId = typeof user?.tenantId === 'string' ? user.tenantId.trim() : '';
    if (jwtTenantId) {
      return this.requireExistingTenantId(jwtTenantId);
    }

    throw new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: 'Tenant context is required from JWT.',
      details: null
    });
  }

  async assertTenantAccess(targetLenderId: string): Promise<void> {
    const current = await this.requireTenantId();
    if (current !== targetLenderId) {
      void this.auditService.log({
        tenantId: current,
        actorType: 'SYSTEM',
        action: 'TENANT_FORBIDDEN',
        entity: 'TENANT',
        entityId: targetLenderId,
        metadata: { currentTenantId: current, targetTenantId: targetLenderId }
      });
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cross-tenant access is not allowed.',
        details: null
      });
    }
  }

  private async getLender(id: string): Promise<{ id: string; status: LenderStatus } | null> {
    if (this.cachedLender?.id === id) {
      return this.cachedLender;
    }

    const lender = await this.prisma.lender.findUnique({
      where: { id },
      select: { id: true, status: true }
    });

    this.cachedLender = lender;
    return lender;
  }

  private async requireExistingTenantId(tenantId: string): Promise<string> {
    if (this.cachedTenantId === tenantId) {
      return tenantId;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true }
    });
    if (!tenant) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid tenant context.',
        details: { tenantId }
      });
    }

    this.cachedTenantId = tenant.id;
    return tenant.id;
  }
}
