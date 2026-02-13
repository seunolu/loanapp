import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AdminPrincipal } from './admin-principal';

export const CurrentAdmin = createParamDecorator((_data: unknown, context: ExecutionContext): AdminPrincipal => {
  const request = context.switchToHttp().getRequest<{ user: AdminPrincipal }>();
  return request.user;
});
