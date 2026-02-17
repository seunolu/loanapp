import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '../../../common/config/env.schema';
import { PrismaService } from '../../../common/database/prisma.service';
import type { TenantAdminPrincipal } from '../../../common/auth/tenant-admin-principal';

type TenantAdminAccessPayload = {
  sub?: string;
  typ?: string;
  tenantId?: string;
  role?: 'SUPER_ADMIN' | 'TENANT_ADMIN';
  email?: string;
};

@Injectable()
export class TenantAdminJwtStrategy extends PassportStrategy(Strategy, 'tenant-admin-jwt') {
  constructor(
    configService: ConfigService<Env, true>,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('TENANT_ADMIN_JWT_SECRET', { infer: true }),
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
      (payload.role !== 'SUPER_ADMIN' && payload.role !== 'TENANT_ADMIN') ||
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
      select: { id: true, tenantId: true, email: true, role: true }
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

    return {
      adminId: admin.id,
      tenantId: admin.tenantId,
      email: admin.email,
      role: admin.role
    };
  }
}

