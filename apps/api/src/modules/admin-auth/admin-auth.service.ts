import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole, AdminStatus } from '@prisma/client';
import type { JwtPayload } from 'jsonwebtoken';
import { sign, verify } from 'jsonwebtoken';
import { AuditService } from '../../common/audit/audit.service';
import { ADMIN_JWT_AUDIENCE, ADMIN_JWT_ISSUER } from '../../common/auth/jwt.constants';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import type { AdminAuthResponseDto } from './dto/admin-auth-response.dto';
import type { AdminInviteValidateDto } from './dto/admin-invite-validate.dto';
import type { AdminLoginDto } from './dto/admin-login.dto';
import type { AdminRefreshDto } from './dto/admin-refresh.dto';
import type { AdminSetupPasswordDto } from './dto/admin-setup-password.dto';
import type { AdminInviteValidateResponseDto } from './dto/admin-invite-validate-response.dto';
import type { AdminSetupPasswordResponseDto } from './dto/admin-setup-password-response.dto';
import { hashPassword, verifyPassword } from './password.util';

type AdminRefreshClaims = JwtPayload & {
  sub: string;
  sid: string;
  lid: string | null;
  typ: 'admin_refresh';
};

@Injectable({ scope: Scope.REQUEST })
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    private readonly auditService: AuditService,
    private readonly requestContextService: RequestContextService,
    private readonly redisService: RedisService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async login(input: AdminLoginDto): Promise<AdminAuthResponseDto> {
    const lenderId = await this.tenantContextService.resolveOptionalAnonymousLenderId();
    const email = input.email.trim().toLowerCase();
    const context = this.requestContextService.get();
    await this.enforceAdminLoginRateLimit(email, context.ip);

    const admin = await this.prisma.adminUser.findFirst({
      where: {
        email,
        ...(lenderId ? { lenderId } : { lenderId: null })
      }
    });

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      await this.auditService.write({
        event: 'ADMIN_LOGIN_FAILED',
        actorType: 'SYSTEM',
        actorId: 'SYSTEM',
        metadata: {
          email
        }
      });
      throw this.unauthorized('Invalid admin credentials.');
    }

    if (!admin.passwordHash) {
      throw this.unauthorized('Password setup required. Complete invite setup first.');
    }

    if (!verifyPassword(input.password, admin.passwordHash)) {
      await this.auditService.write({
        event: 'ADMIN_LOGIN_FAILED',
        actorType: 'SYSTEM',
        actorId: 'SYSTEM',
        metadata: {
          email
        }
      });
      throw this.unauthorized('Invalid admin credentials.');
    }

    const tokens = await this.issueTokens(admin.id, admin.lenderId ?? null, admin.email, admin.role);

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: context.ip ?? null,
        lastUserAgent: context.userAgent ?? null
      }
    });

    await this.auditService.write({
      event: 'ADMIN_LOGIN_SUCCESS',
      actorType: 'ADMIN',
      actorId: admin.id,
      metadata: {
        email: admin.email
      }
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      admin: {
        id: admin.id,
        lenderId: admin.lenderId ?? null,
        email: admin.email,
        role: admin.role
      }
    };
  }

  async refresh(input: AdminRefreshDto, authorizationHeader?: string): Promise<AdminAuthResponseDto> {
    const context = this.requestContextService.get();
    await this.enforceRefreshRateLimit(context.ip, 'admin');

    const refreshToken = this.resolveRefreshToken(input, authorizationHeader);
    const claims = this.verifyRefresh(refreshToken);

    const session = await this.prisma.adminSession.findUnique({
      where: { id: claims.sid },
      include: { adminUser: true }
    });

    if (
      !session ||
      session.adminUserId !== claims.sub ||
      session.adminUser.lenderId !== claims.lid ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.adminUser.status !== AdminStatus.ACTIVE
    ) {
      throw this.unauthorized('Invalid admin refresh token.');
    }

    const expectedHash = this.hashRefreshToken(refreshToken);
    if (!this.safeHashMatch(session.refreshTokenHash, expectedHash)) {
      throw this.unauthorized('Invalid admin refresh token.');
    }

    const rotated = await this.rotateSession(
      session.id,
      session.adminUser.id,
      session.adminUser.lenderId ?? null,
      session.adminUser.email,
      session.adminUser.role
    );

    await this.auditService.write({
      event: 'ADMIN_REFRESH',
      actorType: 'ADMIN',
      actorId: session.adminUser.id,
      metadata: {
        sessionId: session.id,
        newSessionId: rotated.sessionId
      }
    });

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      admin: {
        id: session.adminUser.id,
        lenderId: session.adminUser.lenderId ?? null,
        email: session.adminUser.email,
        role: session.adminUser.role
      }
    };
  }

  async logout(input: AdminRefreshDto, authorizationHeader?: string): Promise<void> {
    const context = this.requestContextService.get();
    await this.enforceRefreshRateLimit(context.ip, 'admin');

    const refreshToken = this.resolveRefreshToken(input, authorizationHeader);
    const claims = this.verifyRefresh(refreshToken);
    const session = await this.prisma.adminSession.findUnique({
      where: { id: claims.sid },
      include: { adminUser: true }
    });

    if (!session || session.adminUserId !== claims.sub || session.adminUser.lenderId !== claims.lid) {
      throw this.unauthorized('Invalid admin refresh token.');
    }

    const expectedHash = this.hashRefreshToken(refreshToken);
    if (!this.safeHashMatch(session.refreshTokenHash, expectedHash)) {
      throw this.unauthorized('Invalid admin refresh token.');
    }

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    await this.auditService.write({
      event: 'ADMIN_LOGOUT',
      actorType: 'ADMIN',
      actorId: session.adminUserId,
      metadata: {
        sessionId: session.id
      }
    });
  }

  async validateInvite(input: AdminInviteValidateDto): Promise<AdminInviteValidateResponseDto> {
    const invite = await this.getValidInviteToken(input.token);
    const lender = invite.adminUser.lender!;
    return {
      valid: true,
      expiresAt: invite.expiresAt.toISOString(),
      admin: {
        id: invite.adminUser.id,
        email: invite.adminUser.email,
        role: invite.adminUser.role
      },
      lender: {
        id: lender.id,
        name: lender.name,
        slug: lender.slug
      }
    };
  }

  async setupPassword(input: AdminSetupPasswordDto): Promise<AdminSetupPasswordResponseDto> {
    const context = this.requestContextService.get();
    await this.enforceInviteSetupRateLimit(context.ip);
    this.ensurePasswordPolicy(input.newPassword);

    const invite = await this.getValidInviteToken(input.token);

    if (invite.adminUser.passwordHash) {
      throw new HttpException(
        {
          code: 'CONFLICT',
          message: 'Password is already set for this admin user.',
          details: null
        },
        HttpStatus.CONFLICT
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const consumeResult = await tx.adminInviteToken.updateMany({
        where: {
          id: invite.id,
          usedAt: null
        },
        data: {
          usedAt: now
        }
      });

      if (consumeResult.count !== 1) {
        throw this.unauthorized('Invalid or already used invite token.');
      }

      await tx.adminUser.update({
        where: { id: invite.adminUser.id },
        data: {
          passwordHash: hashPassword(input.newPassword),
          passwordSetAt: now
        }
      });
    });

    await this.auditService.write({
      event: 'ADMIN_PASSWORD_SET_VIA_INVITE',
      action: 'ADMIN_PASSWORD_SET_VIA_INVITE',
      actorType: 'ADMIN',
      actorId: invite.adminUser.id,
      lenderId: invite.adminUser.lenderId ?? undefined,
      entityType: 'ADMIN_USER',
      entityId: invite.adminUser.id,
      metadata: {
        inviteTokenId: invite.id
      }
    });

    return { ok: true };
  }

  private verifyRefresh(token: string): AdminRefreshClaims {
    try {
      const payload = verify(token, this.getRequiredString('ADMIN_JWT_REFRESH_SECRET')) as AdminRefreshClaims;
      if (payload.typ !== 'admin_refresh' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
        throw new Error('Invalid payload');
      }
      if (payload.lid !== null && typeof payload.lid !== 'string') {
        throw new Error('Invalid payload');
      }
      return payload;
    } catch {
      throw this.unauthorized('Invalid admin refresh token.');
    }
  }

  private resolveRefreshToken(input: AdminRefreshDto, authorizationHeader?: string): string {
    if (input.refreshToken?.trim()) {
      return input.refreshToken.trim();
    }

    if (authorizationHeader) {
      const [scheme, token] = authorizationHeader.split(' ', 2);
      if (scheme?.toLowerCase() === 'bearer' && token?.trim()) {
        return token.trim();
      }
    }

    throw this.unauthorized('Missing admin refresh token.');
  }

  private async rotateSession(
    sessionId: string,
    adminId: string,
    lenderId: string | null,
    email: string,
    role: AdminRole
  ) {
    const issued = await this.issueTokens(adminId, lenderId, email, role);

    await this.prisma.adminSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() }
    });

    return issued;
  }

  private async issueTokens(adminId: string, lenderId: string | null, email: string, role: AdminRole) {
    const refreshTtlSec = this.configService.get('ADMIN_JWT_REFRESH_TTL_SEC', { infer: true });
    const now = new Date();

    const session = await this.prisma.adminSession.create({
      data: {
        adminUserId: adminId,
        refreshTokenHash: this.hashRefreshToken(randomUUID()),
        expiresAt: new Date(now.getTime() + refreshTtlSec * 1000),
        lastSeenAt: now
      }
    });

    const accessToken = sign(
      {
        typ: 'admin',
        sid: session.id,
        lid: lenderId,
        role,
        email
      },
      this.getRequiredString('ADMIN_JWT_ACCESS_SECRET'),
      {
        subject: adminId,
        expiresIn: `${this.configService.get('ADMIN_JWT_ACCESS_TTL_SEC', { infer: true })}s`,
        jwtid: randomUUID(),
        issuer: ADMIN_JWT_ISSUER,
        audience: ADMIN_JWT_AUDIENCE
      }
    );

    const refreshToken = sign(
      {
        typ: 'admin_refresh',
        sid: session.id,
        lid: lenderId,
        role
      },
      this.getRequiredString('ADMIN_JWT_REFRESH_SECRET'),
      {
        subject: adminId,
        expiresIn: `${refreshTtlSec}s`,
        jwtid: randomUUID()
      }
    );

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hashRefreshToken(refreshToken)
      }
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session.id
    };
  }

  private hashRefreshToken(token: string): string {
    return createHmac('sha256', this.getRequiredString('ADMIN_REFRESH_TOKEN_HASH_SECRET')).update(token).digest('hex');
  }

  private hashInviteToken(token: string): string {
    return createHmac('sha256', this.getRequiredString('ADMIN_INVITE_TOKEN_HASH_SECRET')).update(token).digest('hex');
  }

  private async getValidInviteToken(token: string) {
    const tokenHash = this.hashInviteToken(token);
    const invite = await this.prisma.adminInviteToken.findUnique({
      where: { tokenHash },
      include: {
        adminUser: {
          include: {
            lender: true
          }
        }
      }
    });

    if (!invite || !invite.adminUser.lender) {
      throw this.unauthorized('Invalid invite token.');
    }

    if (!this.safeHashMatch(invite.tokenHash, tokenHash)) {
      throw this.unauthorized('Invalid invite token.');
    }

    if (invite.usedAt) {
      throw this.unauthorized('Invite token has already been used.');
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw this.unauthorized('Invite token has expired.');
    }

    return invite;
  }

  private ensurePasswordPolicy(password: string): void {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (password.length < 12 || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      throw new HttpException(
        {
          code: 'BAD_REQUEST',
          message: 'Password does not meet policy requirements.',
          details: [
            'Password must be at least 12 characters and include uppercase, lowercase, number, and special character.'
          ]
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private safeHashMatch(left: string, right: string): boolean {
    const l = Buffer.from(left, 'hex');
    const r = Buffer.from(right, 'hex');
    if (l.length !== r.length) {
      return false;
    }
    return timingSafeEqual(l, r);
  }

  private getRequiredString(key: keyof Env): string {
    const value = this.configService.get(key, { infer: true });
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Missing required configuration: ${String(key)}`);
    }
    return value;
  }

  private unauthorized(message: string): UnauthorizedException {
    return new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message,
      details: null
    });
  }

  private async enforceAdminLoginRateLimit(email: string, ip: string | null): Promise<void> {
    const ipMax = this.configService.get('ADMIN_LOGIN_RATE_LIMIT_IP_MAX', { infer: true });
    const ipWindowSec = this.configService.get('ADMIN_LOGIN_RATE_LIMIT_IP_WINDOW_SEC', { infer: true });
    const emailMax = this.configService.get('ADMIN_LOGIN_RATE_LIMIT_EMAIL_MAX', { infer: true });
    const emailWindowSec = this.configService.get('ADMIN_LOGIN_RATE_LIMIT_EMAIL_WINDOW_SEC', { infer: true });

    const emailCount = await this.redisService.incrementWithWindow(`rl:admin:login:email:${email}`, emailWindowSec);
    let ipCount = 0;
    if (ip) {
      ipCount = await this.redisService.incrementWithWindow(`rl:admin:login:ip:${ip}`, ipWindowSec);
    }

    if (emailCount > emailMax || (ip && ipCount > ipMax)) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Please try again later.',
          details: {
            reason: 'admin_login_rate_limit'
          }
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private async enforceRefreshRateLimit(ip: string | null, scope: string): Promise<void> {
    if (!ip) {
      return;
    }

    const max = this.configService.get('REFRESH_RATE_LIMIT_IP_MAX', { infer: true });
    const windowSec = this.configService.get('REFRESH_RATE_LIMIT_IP_WINDOW_SEC', { infer: true });
    const count = await this.redisService.incrementWithWindow(`rl:refresh:${scope}:ip:${ip}`, windowSec);

    if (count > max) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many refresh requests. Please try again later.',
          details: {
            reason: 'refresh_rate_limit'
          }
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private async enforceInviteSetupRateLimit(ip: string | null): Promise<void> {
    const max = this.configService.get('ADMIN_INVITE_SETUP_RATE_LIMIT_IP_MAX', { infer: true });
    const windowSec = this.configService.get('ADMIN_INVITE_SETUP_RATE_LIMIT_IP_WINDOW_SEC', { infer: true });
    const key = `rl:admin:invite-setup:ip:${ip ?? 'unknown'}`;
    const count = await this.redisService.incrementWithWindow(key, windowSec);

    if (count > max) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many setup password attempts. Please try again later.',
          details: {
            reason: 'admin_invite_setup_rate_limit'
          }
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }
}
