import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResolveTenantQueryDto } from './dto/resolve-tenant-query.dto';
import { ResolveTenantResponseDto } from './dto/resolve-tenant-response.dto';
import { TenantsService } from './tenants.service';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('resolve')
  @RateLimit('PUBLIC_READ')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve tenant by slug' })
  @ApiOkResponse({
    type: ResolveTenantResponseDto,
    description: 'Resolved tenant.',
    example: {
      tenantId: 'tenant_demo',
      id: 'tenant_demo',
      slug: 'demo',
      name: 'Demo Lender',
      lenderTitle: 'Demo'
    }
  })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  resolveTenant(@Query() input: ResolveTenantQueryDto): Promise<ResolveTenantResponseDto> {
    return this.tenantsService.resolveTenant(input);
  }
}
