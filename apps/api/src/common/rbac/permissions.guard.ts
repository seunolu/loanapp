import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminPrincipal } from '../auth/admin-principal';
import type { RequestWithId } from '../types/request-with-id';
import { REQUIRE_PERMISSIONS_KEY } from './require-permissions.decorator';
import type { PermissionCode } from './permissions.constants';
import { RbacService } from './rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<PermissionCode[]>(REQUIRE_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (!requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithId>();
    const principal = request.user as AdminPrincipal | undefined;

    if (!principal?.adminId || !principal.lenderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions.',
        details: null
      });
    }

    const permissions = await this.rbacService.getAdminPermissions(principal.adminId, principal.lenderId);
    const hasAll = requiredPermissions.every((permission) => permissions.includes(permission));

    if (!hasAll) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions.',
        details: {
          requiredPermissions
        }
      });
    }

    return true;
  }
}
