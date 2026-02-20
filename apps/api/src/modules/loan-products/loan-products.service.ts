import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { ProductStatus, type Prisma } from '@prisma/client';
import type { ComputeOfferDto } from './dto/compute-offer.dto';
import type { CreateLoanProductFeeDto } from './dto/create-loan-product-fee.dto';
import type { CreateLoanProductDto } from './dto/create-loan-product.dto';
import type { ListLoanProductsQueryDto } from './dto/list-loan-products-query.dto';
import type { LoanProductDto } from './dto/loan-product.dto';
import type { UpdateLoanProductDto } from './dto/update-loan-product.dto';
import { computeOffer } from './offer-engine';
import { requireTenantId } from '../../common/tenancy/tenant-guard';
import { withTenant } from '../../common/tenancy/tenant-prisma';

@Injectable()
export class LoanProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertRanges(input: {
    minPrincipal: number;
    maxPrincipal: number;
    minTenorDays: number;
    maxTenorDays: number;
    interestRateBps: number;
  }): void {
    if (input.minPrincipal > input.maxPrincipal) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'minPrincipal must be <= maxPrincipal',
        details: null
      });
    }
    if (input.minTenorDays > input.maxTenorDays) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'minTenorDays must be <= maxTenorDays',
        details: null
      });
    }
    if (input.interestRateBps < 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'interestRateBps must be >= 0',
        details: null
      });
    }
  }

  private toDto(product: Prisma.LoanProductGetPayload<{ include: { fees: true } }>): LoanProductDto {
    return {
      id: product.id,
      tenantId: product.tenantId,
      name: product.name,
      status: product.status,
      currency: product.currency,
      minPrincipal: product.minPrincipal,
      maxPrincipal: product.maxPrincipal,
      minTenorDays: product.minTenorDays,
      maxTenorDays: product.maxTenorDays,
      interestType: product.interestType,
      interestRateBps: product.interestRateBps,
      repaymentFrequency: product.repaymentFrequency,
      graceDays: product.graceDays,
      allowEarlyRepayment: product.allowEarlyRepayment,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      fees: product.fees.map((fee) => ({
        id: fee.id,
        name: fee.name,
        type: fee.type,
        amount: fee.amount,
        applyAt: fee.applyAt,
        createdAt: fee.createdAt.toISOString()
      }))
    };
  }

  private async createSnapshotVersion(
    tx: Prisma.TransactionClient,
    productId: string,
    tenantId: string
  ): Promise<void> {
    const product = await tx.loanProduct.findFirst({
      where: { id: productId, tenantId },
      include: { fees: { orderBy: { createdAt: 'asc' } } }
    });
    if (!product) {
      return;
    }
    const current = await tx.loanProductVersion.aggregate({
      where: { loanProductId: productId },
      _max: { version: true }
    });
    const version = (current._max.version ?? 0) + 1;
    await tx.loanProductVersion.create({
      data: {
        tenantId,
        loanProductId: productId,
        version,
        snapshotJson: {
          product: {
            id: product.id,
            name: product.name,
            status: product.status,
            currency: product.currency,
            minPrincipal: product.minPrincipal,
            maxPrincipal: product.maxPrincipal,
            minTenorDays: product.minTenorDays,
            maxTenorDays: product.maxTenorDays,
            interestType: product.interestType,
            interestRateBps: product.interestRateBps,
            repaymentFrequency: product.repaymentFrequency,
            graceDays: product.graceDays,
            allowEarlyRepayment: product.allowEarlyRepayment
          },
          fees: product.fees.map((fee) => ({
            id: fee.id,
            name: fee.name,
            type: fee.type,
            amount: fee.amount,
            applyAt: fee.applyAt
          }))
        }
      }
    });
  }

  private assertCanEdit(product: { status: ProductStatus }, update: UpdateLoanProductDto): void {
    if (product.status !== ProductStatus.ACTIVE) {
      return;
    }
    const keys = new Set(Object.keys(update));
    keys.delete('name');
    if (keys.size > 0) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'ACTIVE products are immutable except for name.',
        details: { blockedFields: [...keys] }
      });
    }
  }

  async create(principal: TenantAdminPrincipal, input: CreateLoanProductDto): Promise<LoanProductDto> {
    const tenantId = requireTenantId(principal.tenantId);
    this.assertRanges({
      minPrincipal: input.minPrincipal,
      maxPrincipal: input.maxPrincipal,
      minTenorDays: input.minTenorDays,
      maxTenorDays: input.maxTenorDays,
      interestRateBps: input.interestRateBps
    });
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.loanProduct.create({
        data: {
          tenantId,
          name: input.name,
          currency: input.currency,
          minPrincipal: input.minPrincipal,
          maxPrincipal: input.maxPrincipal,
          minTenorDays: input.minTenorDays,
          maxTenorDays: input.maxTenorDays,
          interestType: input.interestType,
          interestRateBps: input.interestRateBps,
          repaymentFrequency: input.repaymentFrequency,
          graceDays: input.graceDays,
          allowEarlyRepayment: input.allowEarlyRepayment
        },
        include: { fees: true }
      });
      await this.createSnapshotVersion(tx, row.id, tenantId);
      return row;
    });
    return this.toDto(created);
  }

  async list(principal: TenantAdminPrincipal, query: ListLoanProductsQueryDto): Promise<{ items: LoanProductDto[] }> {
    const tenantId = requireTenantId(principal.tenantId);
    const tp = withTenant(this.prisma, tenantId);
    const rows = await tp.findManyTenantScoped({
      model: 'LoanProduct',
      args: {
        where: { status: query.status ?? undefined },
        orderBy: { createdAt: 'desc' },
        include: { fees: { orderBy: { createdAt: 'asc' } } }
      }
    });
    return { items: rows.map((row: any) => this.toDto(row)) };
  }

  async findOne(principal: TenantAdminPrincipal, id: string): Promise<LoanProductDto> {
    const tenantId = requireTenantId(principal.tenantId);
    const tp = withTenant(this.prisma, tenantId);
    const row = await tp.findUniqueTenantScoped({
      model: 'LoanProduct',
      args: { where: { id }, include: { fees: { orderBy: { createdAt: 'asc' } } } }
    });
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan product not found.',
        details: { id }
      });
    }
    return this.toDto(row);
  }

  async update(
    principal: TenantAdminPrincipal,
    id: string,
    update: UpdateLoanProductDto
  ): Promise<LoanProductDto> {
    const tenantId = requireTenantId(principal.tenantId);
    const tp = withTenant(this.prisma, tenantId);
    const current = await tp.findUniqueTenantScoped({ model: 'LoanProduct', args: { where: { id } } });
    if (!current) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan product not found.',
        details: { id }
      });
    }
    this.assertCanEdit(current, update);
    this.assertRanges({
      minPrincipal: update.minPrincipal ?? current.minPrincipal,
      maxPrincipal: update.maxPrincipal ?? current.maxPrincipal,
      minTenorDays: update.minTenorDays ?? current.minTenorDays,
      maxTenorDays: update.maxTenorDays ?? current.maxTenorDays,
      interestRateBps: update.interestRateBps ?? current.interestRateBps
    });

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.loanProduct.update({
        where: { id: current.id },
        data: {
          ...update,
          updatedAt: new Date()
        },
        include: { fees: true }
      });
      await this.createSnapshotVersion(tx, updated.id, tenantId);
      return updated;
    });
    return this.toDto(row);
  }

  async activate(principal: TenantAdminPrincipal, id: string): Promise<LoanProductDto> {
    const tenantId = requireTenantId(principal.tenantId);
    const row = await this.prisma.$transaction(async (tx) => {
      const tp = withTenant(tx as unknown as Record<string, unknown>, tenantId);
      const current = await tp.findUniqueTenantScoped({
        model: 'LoanProduct',
        args: { where: { id }, include: { fees: true } }
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan product not found.',
          details: { id }
        });
      }
      if (current.status === ProductStatus.ARCHIVED) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Archived products cannot be activated.',
          details: null
        });
      }
      const updated = await tx.loanProduct.update({
        where: { id: current.id },
        data: { status: ProductStatus.ACTIVE },
        include: { fees: true }
      });
      await this.createSnapshotVersion(tx, current.id, tenantId);
      return updated;
    });
    return this.toDto(row);
  }

  async deactivate(principal: TenantAdminPrincipal, id: string): Promise<LoanProductDto> {
    const tenantId = requireTenantId(principal.tenantId);
    const row = await this.prisma.$transaction(async (tx) => {
      const tp = withTenant(tx as unknown as Record<string, unknown>, tenantId);
      const current = await tp.findUniqueTenantScoped({
        model: 'LoanProduct',
        args: { where: { id }, include: { fees: true } }
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan product not found.',
          details: { id }
        });
      }
      if (current.status === ProductStatus.ARCHIVED) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Archived products cannot be deactivated.',
          details: null
        });
      }
      if (current.status === ProductStatus.DRAFT) {
        return current;
      }
      const updated = await tx.loanProduct.update({
        where: { id: current.id },
        data: { status: ProductStatus.DRAFT },
        include: { fees: true }
      });
      await this.createSnapshotVersion(tx, current.id, tenantId);
      return updated;
    });
    return this.toDto(row);
  }

  async archive(principal: TenantAdminPrincipal, id: string): Promise<LoanProductDto> {
    const tenantId = requireTenantId(principal.tenantId);
    const row = await this.prisma.$transaction(async (tx) => {
      const tp = withTenant(tx as unknown as Record<string, unknown>, tenantId);
      const current = await tp.findUniqueTenantScoped({
        model: 'LoanProduct',
        args: { where: { id }, include: { fees: true } }
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan product not found.',
          details: { id }
        });
      }
      const updated = await tx.loanProduct.update({
        where: { id: current.id },
        data: { status: ProductStatus.ARCHIVED },
        include: { fees: true }
      });
      await this.createSnapshotVersion(tx, current.id, tenantId);
      return updated;
    });
    return this.toDto(row);
  }

  async addFee(
    principal: TenantAdminPrincipal,
    id: string,
    input: CreateLoanProductFeeDto
  ): Promise<LoanProductDto> {
    const tenantId = requireTenantId(principal.tenantId);
    const row = await this.prisma.$transaction(async (tx) => {
      const tp = withTenant(tx as unknown as Record<string, unknown>, tenantId);
      const current = await tp.findUniqueTenantScoped({ model: 'LoanProduct', args: { where: { id } } });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan product not found.',
          details: { id }
        });
      }
      if (current.status === ProductStatus.ARCHIVED) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Cannot add fees to archived product.',
          details: null
        });
      }
      await tx.loanProductFee.create({
        data: {
          loanProductId: current.id,
          name: input.name,
          type: input.type,
          amount: input.amount,
          applyAt: input.applyAt
        }
      });
      await this.createSnapshotVersion(tx, current.id, tenantId);
      return tx.loanProduct.findFirstOrThrow({
        where: { id: current.id, tenantId },
        include: { fees: { orderBy: { createdAt: 'asc' } } }
      });
    });

    return this.toDto(row);
  }

  async removeFee(principal: TenantAdminPrincipal, id: string, feeId: string): Promise<LoanProductDto> {
    const tenantId = requireTenantId(principal.tenantId);
    const row = await this.prisma.$transaction(async (tx) => {
      const tp = withTenant(tx as unknown as Record<string, unknown>, tenantId);
      const current = await tp.findUniqueTenantScoped({ model: 'LoanProduct', args: { where: { id } } });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan product not found.',
          details: { id }
        });
      }
      const fee = await tx.loanProductFee.findFirst({
        where: { id: feeId, loanProductId: current.id }
      });
      if (!fee) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan product fee not found.',
          details: { feeId }
        });
      }
      await tx.loanProductFee.delete({ where: { id: fee.id } });
      await this.createSnapshotVersion(tx, current.id, tenantId);
      return tx.loanProduct.findFirstOrThrow({
        where: { id: current.id, tenantId },
        include: { fees: { orderBy: { createdAt: 'asc' } } }
      });
    });
    return this.toDto(row);
  }

  async computeOffer(principal: TenantAdminPrincipal, id: string, input: ComputeOfferDto) {
    const tenantId = requireTenantId(principal.tenantId);
    const tp = withTenant(this.prisma, tenantId);
    const product = await tp.findUniqueTenantScoped({
      model: 'LoanProduct',
      args: { where: { id }, include: { fees: { orderBy: { createdAt: 'asc' } } } }
    });
    if (!product) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan product not found.',
        details: { id }
      });
    }
    if (product.status === ProductStatus.ARCHIVED) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Cannot compute offer for archived product.',
        details: null
      });
    }
    if (input.principalMinor < product.minPrincipal || input.principalMinor > product.maxPrincipal) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'principalMinor is outside product limits.',
        details: {
          minPrincipal: product.minPrincipal,
          maxPrincipal: product.maxPrincipal
        }
      });
    }
    if (input.tenorDays < product.minTenorDays || input.tenorDays > product.maxTenorDays) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'tenorDays is outside product limits.',
        details: {
          minTenorDays: product.minTenorDays,
          maxTenorDays: product.maxTenorDays
        }
      });
    }

    const result = computeOffer(
      {
        id: product.id,
        name: product.name,
        currency: product.currency,
        interestType: product.interestType,
        interestRateBps: product.interestRateBps,
        repaymentFrequency: product.repaymentFrequency,
        graceDays: product.graceDays
      },
      product.fees.map((fee: any) => ({
        id: fee.id,
        name: fee.name,
        type: fee.type,
        amount: fee.amount,
        applyAt: fee.applyAt
      })),
      {
        principalMinor: input.principalMinor,
        tenorDays: input.tenorDays,
        startDate: input.startDate ? new Date(input.startDate) : new Date()
      }
    );

    return {
      ...result,
      productSnapshot: {
        id: product.id,
        name: product.name,
        status: product.status,
        currency: product.currency,
        interestType: product.interestType,
        interestRateBps: product.interestRateBps,
        repaymentFrequency: product.repaymentFrequency,
        graceDays: product.graceDays,
        minPrincipal: product.minPrincipal,
        maxPrincipal: product.maxPrincipal,
        minTenorDays: product.minTenorDays,
        maxTenorDays: product.maxTenorDays,
        fees: product.fees
      }
    };
  }
}
