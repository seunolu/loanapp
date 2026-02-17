import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantLoanApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { CreateTenantLoanApplicationDto } from './dto/create-tenant-loan-application.dto';
import type { ListTenantLoanApplicationsResponseDto } from './dto/list-tenant-loan-applications-response.dto';
import type { TenantLoanApplicationDetailsDto } from './dto/tenant-loan-application-details.dto';
import type { TenantLoanApplicationSummaryDto } from './dto/tenant-loan-application-summary.dto';

@Injectable()
export class LoanApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantIdHeader: string | undefined,
    input: CreateTenantLoanApplicationDto
  ): Promise<TenantLoanApplicationSummaryDto> {
    const tenantId = await this.requireTenantId(tenantIdHeader);

    const created = await this.prisma.tenantLoanApplication.create({
      data: {
        tenantId,
        status: TenantLoanApplicationStatus.SUBMITTED,
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        dob: input.dob ? new Date(input.dob) : null,
        address: input.address?.trim() || null,
        amount: input.amount,
        tenorMonths: input.tenorMonths,
        purpose: input.purpose?.trim() || null,
        employmentStatus: input.employmentStatus?.trim() || null,
        incomeBand: input.incomeBand?.trim() || null
      }
    });

    return {
      id: created.id,
      status: created.status,
      createdAt: created.createdAt.toISOString()
    };
  }

  async findOne(tenantIdHeader: string | undefined, id: string): Promise<TenantLoanApplicationDetailsDto> {
    const tenantId = await this.requireTenantId(tenantIdHeader);
    const application = await this.prisma.tenantLoanApplication.findUnique({
      where: { id }
    });

    if (!application) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: { id }
      });
    }

    if (application.tenantId !== tenantId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cross-tenant access is not allowed.',
        details: null
      });
    }

    return {
      id: application.id,
      tenantId: application.tenantId,
      status: application.status,
      fullName: application.fullName,
      phone: application.phone,
      email: application.email ?? undefined,
      dob: application.dob?.toISOString().slice(0, 10),
      address: application.address ?? undefined,
      amount: application.amount,
      tenorMonths: application.tenorMonths,
      purpose: application.purpose ?? undefined,
      employmentStatus: application.employmentStatus ?? undefined,
      incomeBand: application.incomeBand ?? undefined,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString()
    };
  }

  async list(tenantIdHeader: string | undefined): Promise<ListTenantLoanApplicationsResponseDto> {
    const tenantId = await this.requireTenantId(tenantIdHeader);
    const rows = await this.prisma.tenantLoanApplication.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }

  private async requireTenantId(tenantIdHeader: string | undefined): Promise<string> {
    const tenantId = tenantIdHeader?.trim();
    if (!tenantId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'x-tenant-id header is required.',
        details: { header: 'x-tenant-id' }
      });
    }

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
}

