import { ForbiddenException, Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { TenantAdminPrincipal } from '../../../common/auth/tenant-admin-principal';
import type { Env } from '../../../common/config/env.schema';
import { PrismaService } from '../../../common/database/prisma.service';

type TenantAdminAccessPayload = {
  sub?: string;
  typ?: string;
  tenantId?: string;
  role?: 'CREDIT_OFFICER' | 'RISK_MANAGER' | 'OPS' | 'COLLECTIONS' | 'SYSTEM' | 'SUPER_ADMIN' | 'TENANT_ADMIN';
  email?: string;
};

@Injectable()
export class TenantAdminJwtStrategy extends PassportStrategy(Strategy, 'tenant-admin-jwt') {
  constructor(
    @Optional() @Inject(ConfigService) configService: ConfigService<Env, true> | undefined,
    private readonly prisma: PrismaService
  ) {
    const jwtSecret =
      configService?.get('TENANT_ADMIN_JWT_SECRET', { infer: true }) ??
      process.env.TENANT_ADMIN_JWT_SECRET ??
      'change-this-tenant-admin-jwt-secret';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
      ignoreExpiration: false
    });
  }

  async validate(payload: TenantAdminAccessPayload): Promise<TenantAdminPrincipal> {
    if (
      payload.typ !== 'tenant_admin' ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.tenantId !== 'string' ||
      !payload.tenantId ||
      !this.isValidRole(payload.role) ||
      typeof payload.email !== 'string'
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid tenant admin access token.',
        details: null
      });
    }

    const admin = await this.prisma.tenantAdminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, tenantId: true, email: true, role: true, isActive: true }
    });

    if (!admin) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Tenant admin not found.',
        details: null
      });
    }

    if (admin.tenantId !== payload.tenantId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Token tenant mismatch.',
        details: null
      });
    }

    if (!admin.isActive) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Tenant admin account is suspended.',
        details: null
      });
    }

    return {
      adminId: admin.id,
      tenantId: admin.tenantId,
      email: admin.email,
      role: admin.role
    };
  }

  private isValidRole(role: unknown): role is NonNullable<TenantAdminAccessPayload['role']> {
    return (
      role === 'CREDIT_OFFICER' ||
      role === 'RISK_MANAGER' ||
      role === 'OPS' ||
      role === 'COLLECTIONS' ||
      role === 'SYSTEM' ||
      role === 'SUPER_ADMIN' ||
      role === 'TENANT_ADMIN'
    );
  }
}
