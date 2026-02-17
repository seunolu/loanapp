import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { ResolveTenantQueryDto } from './dto/resolve-tenant-query.dto';
import type { ResolveTenantResponseDto } from './dto/resolve-tenant-response.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveTenant(input: ResolveTenantQueryDto): Promise<ResolveTenantResponseDto> {
    const slug = input.slug.trim().toLowerCase();
    const lenderTitle = input.lenderTitle?.trim();

    const bySlug = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        lenderTitle: true,
        apiBaseUrl: true,
        theme: true
      }
    });

    if (!bySlug) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Tenant not found.',
        details: { slug }
      });
    }

    if (lenderTitle) {
      const titleMatchesName =
        bySlug.name.toLowerCase().includes(lenderTitle.toLowerCase()) ||
        bySlug.lenderTitle?.toLowerCase().includes(lenderTitle.toLowerCase());
      if (!titleMatchesName) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Tenant not found.',
          details: { slug, lenderTitle }
        });
      }
    }

    return {
      tenantId: bySlug.id,
      id: bySlug.id,
      slug: bySlug.slug,
      name: bySlug.name,
      lenderTitle: bySlug.lenderTitle ?? undefined,
      apiBaseUrl: bySlug.apiBaseUrl ?? undefined,
      theme: bySlug.theme && typeof bySlug.theme === 'object' && !Array.isArray(bySlug.theme)
        ? (bySlug.theme as Record<string, unknown>)
        : undefined
    };
  }
}
