import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from './permissions.constants';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

export function RequirePermissions(...permissions: PermissionCode[]): MethodDecorator & ClassDecorator {
  return SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
}
