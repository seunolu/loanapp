import { BadRequestException, Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentTenantAdmin } from '../../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../../admin-auth/guards/tenant-admin-auth.guard';
import { portfolioTrendsQuerySchema } from './dto/portfolio-trends.dto';
import { PortfolioService } from './portfolio.service';
import { Post } from '@nestjs/common';

const monthsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6)
});

const daysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(120).default(30)
});

@ApiTags('Admin Portfolio')
@ApiBearerAuth('bearer')
@Controller('admin/portfolio')
@UseGuards(TenantAdminAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get tenant-scoped executive portfolio KPIs' })
  @ApiOkResponse()
  getKpis(@CurrentTenantAdmin() principal: TenantAdminPrincipal) {
    return this.portfolioService.getKpis(principal);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get tenant-scoped executive portfolio trend series' })
  @ApiOkResponse()
  getTrends(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = portfolioTrendsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid portfolio trends query.',
        details: parsed.error.flatten()
      });
    }
    return this.portfolioService.getTrends(principal, parsed.data);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get tenant portfolio snapshot summary' })
  @ApiOkResponse()
  getSummary(@CurrentTenantAdmin() principal: TenantAdminPrincipal) {
    return this.portfolioService.getPortfolioSummary(principal);
  }

  @Get('par')
  @ApiOperation({ summary: 'Get tenant PAR buckets and PAR30/PAR90 totals' })
  @ApiOkResponse()
  getPar(@CurrentTenantAdmin() principal: TenantAdminPrincipal) {
    return this.portfolioService.getParBuckets(principal);
  }

  @Get('delinquency')
  @ApiOperation({ summary: 'Get tenant delinquency ratios (PAR30 ratio / NPL ratio)' })
  @ApiOkResponse()
  getDelinquency(@CurrentTenantAdmin() principal: TenantAdminPrincipal) {
    return this.portfolioService.getDelinquencyRatios(principal);
  }

  @Get('vintage')
  @ApiOperation({ summary: 'Get tenant vintage/cohort analysis' })
  @ApiOkResponse()
  getVintage(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = monthsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid vintage query.',
        details: parsed.error.flatten()
      });
    }
    return this.portfolioService.getVintageAnalysis(principal, parsed.data.months);
  }

  @Get('collections')
  @ApiOperation({ summary: 'Get collections effectiveness daily series' })
  @ApiOkResponse()
  getCollections(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = daysQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid collections query.',
        details: parsed.error.flatten()
      });
    }
    return this.portfolioService.getCollectionsSeries(principal, parsed.data.days);
  }

  @Get('treasury')
  @ApiOperation({ summary: 'Get treasury exposure by pool' })
  @ApiOkResponse()
  getTreasury(@CurrentTenantAdmin() principal: TenantAdminPrincipal) {
    return this.portfolioService.getTreasuryExposure(principal);
  }

  @Post('recompute')
  @ApiOperation({ summary: 'Recompute portfolio daily snapshots (SUPER_ADMIN only)' })
  @ApiOkResponse()
  recompute(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    if (principal.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only SUPER_ADMIN can trigger portfolio recomputation.',
        details: null
      });
    }
    const parsed = daysQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid recompute query.',
        details: parsed.error.flatten()
      });
    }
    return this.portfolioService.recomputeDailySnapshots(principal.tenantId, parsed.data.days);
  }
}
