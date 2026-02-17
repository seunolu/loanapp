import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantAdminPrincipal } from './tenant-admin-principal';

export const CurrentTenantAdmin = createParamDecorator((_data: unknown, context: ExecutionContext): TenantAdminPrincipal => {
  const request = context.switchToHttp().getRequest<{ user: TenantAdminPrincipal }>();
  return request.user;
});

