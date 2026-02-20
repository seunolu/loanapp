import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { computeOfferSchema } from './dto/compute-offer.dto';
import { createLoanProductFeeSchema } from './dto/create-loan-product-fee.dto';
import { createLoanProductSchema } from './dto/create-loan-product.dto';
import { type ComputeOfferResponseDto, type ListLoanProductsResponseDto, type LoanProductDto } from './dto/loan-product.dto';
import { ListLoanProductsQueryDto } from './dto/list-loan-products-query.dto';
import { updateLoanProductSchema } from './dto/update-loan-product.dto';
import { LoanProductsService } from './loan-products.service';

@ApiTags('Loan Products')
@ApiBearerAuth('bearer')
@Controller('loan-products')
@UseGuards(TenantAdminAuthGuard)
export class LoanProductsController {
  constructor(private readonly loanProductsService: LoanProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create loan product' })
  @ApiOkResponse({ type: Object })
  async create(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Body() body: unknown
  ): Promise<LoanProductDto> {
    const parsed = createLoanProductSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid create loan product payload.',
        details: parsed.error.flatten()
      });
    }
    return this.loanProductsService.create(admin, parsed.data);
  }

  @Get()
  @ApiOperation({ summary: 'List loan products' })
  @ApiOkResponse({ type: Object })
  list(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: ListLoanProductsQueryDto
  ): Promise<ListLoanProductsResponseDto> {
    return this.loanProductsService.list(admin, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan product' })
  @ApiOkResponse({ type: Object })
  findOne(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<LoanProductDto> {
    return this.loanProductsService.findOne(admin, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update loan product' })
  @ApiOkResponse({ type: Object })
  async update(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<LoanProductDto> {
    const parsed = updateLoanProductSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid update loan product payload.',
        details: parsed.error.flatten()
      });
    }
    return this.loanProductsService.update(admin, id, parsed.data);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate loan product' })
  @ApiOkResponse({ type: Object })
  activate(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<LoanProductDto> {
    return this.loanProductsService.activate(admin, id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate loan product (set to draft)' })
  @ApiOkResponse({ type: Object })
  deactivate(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<LoanProductDto> {
    return this.loanProductsService.deactivate(admin, id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive loan product' })
  @ApiOkResponse({ type: Object })
  archive(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<LoanProductDto> {
    return this.loanProductsService.archive(admin, id);
  }

  @Post(':id/fees')
  @ApiOperation({ summary: 'Add loan product fee' })
  @ApiOkResponse({ type: Object })
  async addFee(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<LoanProductDto> {
    const parsed = createLoanProductFeeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid create fee payload.',
        details: parsed.error.flatten()
      });
    }
    return this.loanProductsService.addFee(admin, id, parsed.data);
  }

  @Delete(':id/fees/:feeId')
  @ApiOperation({ summary: 'Remove loan product fee' })
  @ApiOkResponse({ type: Object })
  removeFee(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Param('feeId') feeId: string
  ): Promise<LoanProductDto> {
    return this.loanProductsService.removeFee(admin, id, feeId);
  }

  @Post(':id/compute-offer')
  @ApiOperation({ summary: 'Compute offer from loan product' })
  @ApiOkResponse({ type: Object })
  async computeOffer(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<ComputeOfferResponseDto> {
    const parsed = computeOfferSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid compute offer payload.',
        details: parsed.error.flatten()
      });
    }
    return this.loanProductsService.computeOffer(admin, id, parsed.data);
  }
}
