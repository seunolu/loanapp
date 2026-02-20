import { ForbiddenException, Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AdminStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AdminPrincipal } from '../../../common/auth/admin-principal';
import type { AdminRoleName } from '../../../common/auth/admin-principal';
import { ADMIN_JWT_AUDIENCE, ADMIN_JWT_ISSUER } from '../../../common/auth/jwt.constants';
import type { Env } from '../../../common/config/env.schema';
import { PrismaService } from '../../../common/database/prisma.service';

type AdminAccessPayload = {
  sub?: string;
  sid?: string;
  typ?: string;
  lid?: string | null;
  tenantId?: string | null;
  role?: AdminRoleName;
  email?: string;
};

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @Optional() @Inject(ConfigService) configService: ConfigService<Env, true> | undefined,
    private readonly prisma: PrismaService
  ) {
    const jwtSecret =
      configService?.get('ADMIN_JWT_ACCESS_SECRET', { infer: true }) ??
      process.env.ADMIN_JWT_ACCESS_SECRET ??
      'change-this-admin-access-secret';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
      issuer: ADMIN_JWT_ISSUER,
      audience: ADMIN_JWT_AUDIENCE,
      ignoreExpiration: false
    });
  }

  async validate(payload: AdminAccessPayload): Promise<AdminPrincipal> {
    if (
      payload.typ !== 'admin' ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.sid !== 'string' ||
      !payload.sid ||
      !this.isValidAdminRole(payload.role) ||
      typeof payload.email !== 'string'
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid admin access token.',
        details: null
      });
    }

    const session = await this.prisma.adminSession.findUnique({
      where: { id: payload.sid },
      include: { adminUser: true }
    });

    if (
      !session ||
      session.adminUserId !== payload.sub ||
      session.adminUser.lenderId !== (payload.lid ?? null) ||
      session.adminUser.lenderId !== (payload.tenantId ?? null) ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Admin session is invalid or revoked.',
        details: null
      });
    }

    if (session.adminUser.status !== AdminStatus.ACTIVE) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Admin user is not active.',
        details: null
      });
    }

    return {
      adminId: session.adminUser.id,
      lenderId: session.adminUser.lenderId ?? '',
      tenantId: session.adminUser.lenderId ?? null,
      email: session.adminUser.email,
      role: session.adminUser.role,
      sessionId: session.id
    };
  }

  private isValidAdminRole(role: unknown): role is AdminRoleName {
    return (
      role === 'PLATFORM_SUPER_ADMIN' ||
      role === 'OWNER' ||
      role === 'SUPER_ADMIN' ||
      role === 'OPS' ||
      role === 'FINANCE' ||
      role === 'VIEWER'
    );
  }
}

