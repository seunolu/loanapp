import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithId } from '../types/request-with-id';
import { ADMIN_CONFIRMATION_META, type AdminConfirmationMeta } from './admin-confirmation.decorator';
import { AdminConfirmationService } from './admin-confirmation.service';

@Injectable()
export class AdminConfirmationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminConfirmationService: AdminConfirmationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta =
      this.reflector.getAllAndOverride<AdminConfirmationMeta | null>(ADMIN_CONFIRMATION_META, [
        context.getHandler(),
        context.getClass()
      ]) ?? null;
    if (!meta) {
      return true;
    }
    const req = context.switchToHttp().getRequest<RequestWithId>();
    const user = (req.user ?? {}) as { adminId?: string; tenantId?: string; role?: string };
    await this.adminConfirmationService.consumeOrThrow({
      token: req.header('x-admin-confirmation'),
      purpose: meta.purpose,
      resourceId: meta.resourceParam ? (req.params?.[meta.resourceParam] ?? null) : null,
      tenantId: user.tenantId ?? '',
      adminId: user.adminId ?? '',
      adminRole: user.role ?? 'UNKNOWN'
    });
    return true;
  }
}

