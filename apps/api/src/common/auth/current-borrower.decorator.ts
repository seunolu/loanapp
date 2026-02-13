import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { BorrowerPrincipal } from './borrower-principal';

export const CurrentBorrower = createParamDecorator(
  (_data: unknown, context: ExecutionContext): BorrowerPrincipal => {
    const request = context.switchToHttp().getRequest<{ user: BorrowerPrincipal }>();
    return request.user;
  }
);

