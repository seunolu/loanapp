import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import type { Prisma, TenantLoanApplication } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { prismaTenantScope } from './prisma-tenant-scope';

@Injectable({ scope: Scope.REQUEST })
export class TenantScopedPrismaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async createTenantLoanApplication(
    data: Omit<Prisma.TenantLoanApplicationUncheckedCreateInput, 'tenantId'>
  ): Promise<TenantLoanApplication> {
    const tenantId = await this.tenantContextService.requireResolvedTenantId();
    return this.prisma.tenantLoanApplication.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  async findManyTenantLoanApplications(
    args: Omit<Prisma.TenantLoanApplicationFindManyArgs, 'where'> & {
      where?: Omit<Prisma.TenantLoanApplicationWhereInput, 'tenantId'>;
    } = {}
  ): Promise<TenantLoanApplication[]> {
    const tenantId = await this.tenantContextService.requireResolvedTenantId();
    // TENANT_SCOPED_QUERY
    return this.prisma.tenantLoanApplication.findMany({
      ...args,
      where: this.mergeTenantWhere(args.where, tenantId)
    });
  }

  async findTenantLoanApplicationById(
    id: string
  ): Promise<TenantLoanApplication> {
    const tenantId = await this.tenantContextService.requireResolvedTenantId();
    const row = await this.prisma.tenantLoanApplication.findFirst({
      where: { id, tenantId }
    });
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: { id }
      });
    }
    return row;
  }

  async updateTenantLoanApplicationById(
    id: string,
    data: Prisma.TenantLoanApplicationUpdateInput
  ): Promise<TenantLoanApplication> {
    const tenantId = await this.tenantContextService.requireResolvedTenantId();
    const updated = await this.prisma.tenantLoanApplication.updateMany({
      where: { id, tenantId },
      data
    });
    if (updated.count !== 1) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: { id }
      });
    }
    return this.prisma.tenantLoanApplication.findFirstOrThrow({
      where: { id, tenantId }
    });
  }

  private mergeTenantWhere(
    where: Omit<Prisma.TenantLoanApplicationWhereInput, 'tenantId'> | undefined,
    tenantId: string
  ): Prisma.TenantLoanApplicationWhereInput {
    return prismaTenantScope(where, tenantId);
  }
}
