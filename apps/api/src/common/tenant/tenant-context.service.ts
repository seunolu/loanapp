import { BadRequestException, ForbiddenException, Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { LenderStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { RequestWithId } from '../types/request-with-id';

type UserWithLender = {
  lenderId?: string;
};

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private cachedLender: { id: string; status: LenderStatus } | null = null;

  constructor(
    @Inject(REQUEST) private readonly request: RequestWithId,
    private readonly prisma: PrismaService
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

  async assertTenantAccess(targetLenderId: string): Promise<void> {
    const current = await this.requireTenantId();
    if (current !== targetLenderId) {
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
}
