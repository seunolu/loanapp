import { ForbiddenException, NotFoundException } from '@nestjs/common';

const TENANT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{2,127}$/;

export function requireTenantId(tenantId: string | null | undefined): string {
  const normalized = tenantId?.trim() ?? '';
  if (!normalized || !TENANT_ID_PATTERN.test(normalized)) {
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Tenant context is required from JWT.',
      details: null
    });
  }
  return normalized;
}

export function ensureTenantMatch(entityTenantId: string, tenantId: string): void {
  if (entityTenantId !== tenantId) {
    throw new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Resource not found.',
      details: null
    });
  }
}
