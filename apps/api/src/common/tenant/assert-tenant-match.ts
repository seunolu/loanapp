import { InternalServerErrorException } from '@nestjs/common';

export function assertTenantMatch(entityTenantId: string | null | undefined, jwtTenantId: string): void {
  if (!entityTenantId || entityTenantId !== jwtTenantId) {
    throw new InternalServerErrorException({
      code: 'TENANT_MISMATCH',
      message: 'Tenant integrity check failed.',
      details: {
        entityTenantId: entityTenantId ?? null,
        jwtTenantId
      }
    });
  }
}

