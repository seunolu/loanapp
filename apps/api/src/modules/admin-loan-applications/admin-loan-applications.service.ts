import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantLoanApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import type { AdminListLoanApplicationsQueryDto } from './dto/admin-list-loan-applications-query.dto';
import type { AdminListLoanApplicationsResponseDto } from './dto/admin-list-loan-applications-response.dto';
import type { AdminLoanApplicationDetailsDto } from './dto/admin-loan-application-details.dto';
import type { AdminUpdateLoanApplicationStatusDto } from './dto/admin-update-loan-application-status.dto';

@Injectable()
export class AdminLoanApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    principal: TenantAdminPrincipal,
    query: AdminListLoanApplicationsQueryDto,
    requestedTenantId?: string
  ): Promise<AdminListLoanApplicationsResponseDto> {
    const tenantId = await this.resolveTenantScope(principal, requestedTenantId);

    const rows = await this.prisma.tenantLoanApplication.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        status: row.status,
        fullName: row.fullName,
        phone: row.phone,
        amount: row.amount,
        tenorMonths: row.tenorMonths,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }

  async findOne(
    principal: TenantAdminPrincipal,
    id: string,
    requestedTenantId?: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    const tenantId = await this.resolveTenantScope(principal, requestedTenantId);
    const row = await this.prisma.tenantLoanApplication.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: { id }
      });
    }
    if (row.tenantId !== tenantId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cross-tenant access is not allowed.',
        details: null
      });
    }

    return {
      id: row.id,
      tenantId: row.tenantId,
      status: row.status,
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      dob: row.dob ? row.dob.toISOString().slice(0, 10) : null,
      address: row.address,
      amount: row.amount,
      tenorMonths: row.tenorMonths,
      purpose: row.purpose,
      employmentStatus: row.employmentStatus,
      incomeBand: row.incomeBand,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      events: row.events.map((event) => ({
        id: event.id,
        adminId: event.adminId,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        reason: event.reason,
        createdAt: event.createdAt.toISOString()
      }))
    };
  }

  async updateStatus(
    principal: TenantAdminPrincipal,
    id: string,
    body: AdminUpdateLoanApplicationStatusDto,
    requestedTenantId?: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    const tenantId = await this.resolveTenantScope(principal, requestedTenantId);
    const existing = await this.prisma.tenantLoanApplication.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: { id }
      });
    }
    if (existing.tenantId !== tenantId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cross-tenant access is not allowed.',
        details: null
      });
    }

    this.assertTransitionAllowed(existing.status, body.status);

    await this.prisma.$transaction(async (tx) => {
      await tx.tenantLoanApplication.update({
        where: { id: existing.id },
        data: {
          status: body.status
        }
      });
      await tx.tenantLoanApplicationEvent.create({
        data: {
          loanApplicationId: existing.id,
          adminId: principal.adminId,
          fromStatus: existing.status,
          toStatus: body.status,
          reason: body.reason?.trim() || null
        }
      });
    });

    return this.findOne(principal, id, tenantId);
  }

  private async resolveTenantScope(principal: TenantAdminPrincipal, requestedTenantId?: string): Promise<string> {
    const headerTenantId = requestedTenantId?.trim();
    if (principal.role === 'SUPER_ADMIN') {
      const tenantId = headerTenantId || principal.tenantId;
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true }
      });
      if (!tenant) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Tenant not found.',
          details: { tenantId }
        });
      }
      return tenant.id;
    }

    if (headerTenantId && headerTenantId !== principal.tenantId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'TENANT_ADMIN cannot impersonate other tenants.',
        details: null
      });
    }

    return principal.tenantId;
  }

  private assertTransitionAllowed(from: TenantLoanApplicationStatus, to: TenantLoanApplicationStatus): void {
    const allowed: Record<TenantLoanApplicationStatus, TenantLoanApplicationStatus[]> = {
      DRAFT: [],
      SUBMITTED: [TenantLoanApplicationStatus.APPROVED, TenantLoanApplicationStatus.REJECTED],
      UNDER_REVIEW: [],
      APPROVED: [TenantLoanApplicationStatus.DISBURSED],
      REJECTED: [],
      DISBURSED: []
    };

    if (!allowed[from].includes(to)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Invalid status transition from ${from} to ${to}.`,
        details: {
          from,
          to,
          allowedTo: allowed[from]
        }
      });
    }
  }
}

