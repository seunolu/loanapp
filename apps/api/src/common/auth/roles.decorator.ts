import { SetMetadata } from '@nestjs/common';
import type { AdminRoleName } from './admin-principal';

export const ROLES_KEY = 'roles';

export function Roles(...roles: AdminRoleName[]): MethodDecorator & ClassDecorator {
  return SetMetadata(ROLES_KEY, roles);
}
