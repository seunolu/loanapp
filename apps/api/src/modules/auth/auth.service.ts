import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from 'jsonwebtoken';
import { sign, verify } from 'jsonwebtoken';
import { AuditService } from '../../common/audit/audit.service';
import { BORROWER_JWT_AUDIENCE, BORROWER_JWT_ISSUER } from '../../common/auth/jwt.constants';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService } from '../../common/notifications/notifications.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RiskService } from '../../common/risk/risk.service';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { OtpRateLimitService } from './otp-rate-limit.service';
import type { RequestOtpDto } from './dto/request-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';

type TokenPairResponse = {
  accessToken: string;
  refreshToken: string;
  borrower: {
    id: string;
    lenderId: string;
    phone: string;
  };
};

type RefreshClaims = JwtPayload & {
  sub: string;
  sid: string;
  lid: string;
  type: 'refresh';
};

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    private readonly rateLimitService: OtpRateLimitService,
    private readonly requestContextService: RequestContextService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService,
    private readonly riskService: RiskService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async requestOtp(input: RequestOtpDto): Promise<{ otpRef: string; expiresInSec: number }> {
    const phone = input.phone.trim();
    const context = this.requestContextService.get();
    const lenderId = await this.tenantContextService.requireAnonymousLenderId();

    const expiresInSec = this.configService.get('OTP_EXPIRES_IN_SEC', { infer: true });
    const phoneMax = this.configService.get('OTP_RATE_LIMIT_PHONE_MAX', { infer: true });
    const phoneWindowSec = this.configService.get('OTP_RATE_LIMIT_PHONE_WINDOW_SEC', { infer: true });
    const ipMax = this.configService.get('OTP_RATE_LIMIT_IP_MAX', { infer: true });
    const ipWindowSec = this.configService.get('OTP_RATE_LIMIT_IP_WINDOW_SEC', { infer: true });

    const risk = await this.riskService.evaluate({
      lenderId,
      phone,
      eventType: 'OTP_REQUEST',
      metadata: {
        stage: 'request_otp'
      }
    });

    if (risk.blocked) {
      throw new HttpException(
        {
          code: 'FORBIDDEN',
          message: 'Request blocked due to risk checks.',
          details: { reason: risk.reason }
        },
        HttpStatus.FORBIDDEN
      );
    }

    const allowed = await this.rateLimitService.check(
      phone,
      context.ip,
      { limit: phoneMax, windowMs: phoneWindowSec * 1000 },
      { limit: ipMax, windowMs: ipWindowSec * 1000 }
    );

    if (!allowed) {
      await this.auditService.write({
        event: 'AUTH_REQUEST_OTP',
        actorType: 'SYSTEM',
        actorId: 'SYSTEM',
        metadata: {
          outcome: 'RATE_LIMITED',
          phone
        }
      });

      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many OTP requests. Please try again later.',
          details: {
            reason: 'otp_request_rate_limit'
          }
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const otp = this.getOtpForCurrentEnvironment();
    const otpRef = randomUUID();
    const otpHash = this.hashOtp(otpRef, phone, otp);
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);

    await this.prisma.otpChallenge.create({
      data: {
        lenderId,
        otpRef,
        phone,
        otpHash,
        expiresAt
      }
    });

    await this.auditService.write({
      event: 'AUTH_REQUEST_OTP',
      actorType: 'SYSTEM',
      actorId: 'SYSTEM',
      metadata: {
        outcome: 'OK',
        phone
      }
    });

    await this.notificationsService.sendOtpRequested(phone, otpRef, expiresInSec);

    return {
      otpRef,
      expiresInSec
    };
  }

  async verifyOtp(input: VerifyOtpDto): Promise<TokenPairResponse> {
    const phone = input.phone.trim();
    const context = this.requestContextService.get();
    await this.enforceBorrowerLoginRateLimit(context.ip);
    const lenderId = await this.tenantContextService.requireAnonymousLenderId();
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { otpRef: input.otpRef } });

    const risk = await this.riskService.evaluate({
      lenderId,
      phone,
      eventType: 'BORROWER_LOGIN',
      deviceId: input.deviceId,
      metadata: {
        stage: 'verify_otp'
      }
    });

    if (risk.blocked) {
      throw new HttpException(
        {
          code: 'FORBIDDEN',
          message: 'Login blocked due to risk checks.',
          details: { reason: risk.reason }
        },
        HttpStatus.FORBIDDEN
      );
    }

    if (!challenge || challenge.phone !== phone || challenge.lenderId !== lenderId) {
      await this.auditVerifyFailed(phone, 'NOT_FOUND');
      throw this.unauthorized('UNAUTHORIZED', 'Invalid OTP challenge.');
    }

    if (challenge.consumedAt) {
      await this.auditVerifyFailed(phone, 'ALREADY_CONSUMED');
      throw this.unauthorized('UNAUTHORIZED', 'OTP challenge already used.');
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.auditVerifyFailed(phone, 'EXPIRED');
      throw this.unauthorized('UNAUTHORIZED', 'OTP challenge expired.');
    }

    const maxAttempts = this.configService.get('OTP_MAX_VERIFY_ATTEMPTS', { infer: true });
    if (challenge.attempts >= maxAttempts) {
      await this.auditVerifyFailed(phone, 'ATTEMPTS_EXCEEDED');
      throw this.unauthorized('UNAUTHORIZED', 'OTP attempts exceeded.');
    }

    const expectedHash = this.hashOtp(challenge.otpRef, phone, input.otp);
    if (!this.safeHashMatch(challenge.otpHash, expectedHash)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } }
      });
      await this.auditVerifyFailed(phone, 'INVALID_OTP');
      throw this.unauthorized('UNAUTHORIZED', 'Invalid OTP code.');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        consumedAt: new Date()
      }
    });

    const borrower = await this.prisma.borrower.upsert({
      where: {
        lenderId_phone: {
          lenderId,
          phone
        }
      },
      update: {},
      create: { phone, lenderId }
    });

    await this.riskService.evaluate({
      lenderId,
      borrowerId: borrower.id,
      phone,
      eventType: 'BORROWER_LOGIN_SUCCESS',
      deviceId: input.deviceId
    });

    const device = await this.upsertDevice(borrower.id, input.deviceId, input.deviceName, input.platform);
    const tokens = await this.issueTokens({
      borrowerId: borrower.id,
      lenderId: borrower.lenderId,
      phone: borrower.phone,
      borrowerDeviceId: device?.id ?? null
    });

    await this.auditService.write({
      event: 'AUTH_VERIFY_OTP_SUCCESS',
      actorType: 'SYSTEM',
      actorId: 'SYSTEM',
      metadata: {
        phone,
        borrowerId: borrower.id,
        deviceId: input.deviceId ?? null
      }
    });

    return {
      ...tokens,
      borrower: {
        id: borrower.id,
        lenderId: borrower.lenderId,
        phone: borrower.phone
      }
    };
  }

  async refresh(input: RefreshTokenDto): Promise<TokenPairResponse> {
    const context = this.requestContextService.get();
    await this.enforceRefreshRateLimit(context.ip);
    const claims = this.verifyRefreshToken(input.refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { id: claims.sid },
      include: { borrower: true }
    });

    if (
      !session ||
      session.borrowerId !== claims.sub ||
      session.borrower.lenderId !== claims.lid ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw this.unauthorized('UNAUTHORIZED', 'Invalid refresh token.');
    }

    const expectedHash = this.hashRefreshToken(input.refreshToken);
    if (!this.safeHashMatch(session.refreshTokenHash, expectedHash)) {
      throw this.unauthorized('UNAUTHORIZED', 'Invalid refresh token.');
    }

    const rotated = await this.rotateSession(
      session.id,
      session.borrowerId,
      session.borrower.lenderId,
      session.borrower.phone,
      session.borrowerDeviceId
    );

    await this.auditService.write({
      event: 'AUTH_REFRESH',
      actorType: 'SYSTEM',
      actorId: session.borrowerId,
      metadata: {
        sessionId: session.id,
        newSessionId: rotated.sessionId,
        borrowerId: session.borrowerId
      }
    });

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      borrower: {
        id: session.borrower.id,
        lenderId: session.borrower.lenderId,
        phone: session.borrower.phone
      }
    };
  }

  async logout(input: RefreshTokenDto): Promise<{ ok: true }> {
    const context = this.requestContextService.get();
    await this.enforceRefreshRateLimit(context.ip);
    const claims = this.verifyRefreshToken(input.refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { id: claims.sid },
      include: { borrower: true }
    });

    if (!session || session.borrowerId !== claims.sub || session.borrower.lenderId !== claims.lid) {
      throw this.unauthorized('UNAUTHORIZED', 'Invalid refresh token.');
    }

    const expectedHash = this.hashRefreshToken(input.refreshToken);
    if (!this.safeHashMatch(session.refreshTokenHash, expectedHash)) {
      throw this.unauthorized('UNAUTHORIZED', 'Invalid refresh token.');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date()
      }
    });

    await this.auditService.write({
      event: 'AUTH_LOGOUT',
      actorType: 'SYSTEM',
      actorId: session.borrowerId,
      metadata: {
        sessionId: session.id,
        borrowerId: session.borrowerId
      }
    });

    return { ok: true };
  }

  private verifyRefreshToken(token: string): RefreshClaims {
    try {
      const payload = verify(token, this.getRequiredString('JWT_REFRESH_SECRET')) as RefreshClaims;
      if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
        throw new Error('Invalid refresh token payload');
      }
      if (typeof payload.lid !== 'string' || !payload.lid) {
        throw new Error('Invalid refresh token payload');
      }
      return payload;
    } catch {
      throw this.unauthorized('UNAUTHORIZED', 'Invalid refresh token.');
    }
  }

  private async rotateSession(
    sessionId: string,
    borrowerId: string,
    lenderId: string,
    phone: string,
    borrowerDeviceId: string | null
  ) {
    const issued = await this.issueTokens({ borrowerId, lenderId, phone, borrowerDeviceId });

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date()
      }
    });

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      sessionId: issued.sessionId
    };
  }

  private async issueTokens(params: {
    borrowerId: string;
    lenderId: string;
    phone: string | null;
    borrowerDeviceId: string | null;
  }): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const now = new Date();
    const refreshTtlSec = this.configService.get('JWT_REFRESH_TTL_SEC', { infer: true });

    const placeholderHash = this.hashRefreshToken(randomUUID());
    const session = await this.prisma.session.create({
      data: {
        borrowerId: params.borrowerId,
        borrowerDeviceId: params.borrowerDeviceId,
        refreshTokenHash: placeholderHash,
        expiresAt: new Date(now.getTime() + refreshTtlSec * 1000),
        lastSeenAt: now
      }
    });

    const accessToken = sign(
      { typ: 'borrower', phone: params.phone, sid: session.id, lid: params.lenderId, tenantId: params.lenderId },
      this.getRequiredString('JWT_ACCESS_SECRET'),
      {
        subject: params.borrowerId,
        expiresIn: `${this.configService.get('JWT_ACCESS_TTL_SEC', { infer: true })}s`,
        jwtid: randomUUID(),
        issuer: BORROWER_JWT_ISSUER,
        audience: BORROWER_JWT_AUDIENCE
      }
    );

    const refreshToken = sign(
      {
        type: 'refresh',
        sid: session.id,
        lid: params.lenderId,
        did: params.borrowerDeviceId
      },
      this.getRequiredString('JWT_REFRESH_SECRET'),
      {
        subject: params.borrowerId,
        expiresIn: `${refreshTtlSec}s`,
        jwtid: randomUUID()
      }
    );

    await this.prisma.session.update({
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

  private async upsertDevice(
    borrowerId: string,
    deviceId?: string,
    deviceName?: string,
    platform?: string
  ) {
    if (!deviceId?.trim()) {
      return null;
    }

    return this.prisma.borrowerDevice.upsert({
      where: {
        borrowerId_deviceId: {
          borrowerId,
          deviceId
        }
      },
      update: {
        lastSeenAt: new Date(),
        deviceName: deviceName ?? null,
        platform: platform ?? null
      },
      create: {
        borrowerId,
        deviceId,
        deviceName: deviceName ?? null,
        platform: platform ?? null,
        lastSeenAt: new Date()
      }
    });
  }

  private hashOtp(otpRef: string, phone: string, otp: string): string {
    const secret = this.getRequiredString('OTP_HASH_SECRET');
    return createHmac('sha256', secret).update(`${otpRef}:${phone}:${otp}`).digest('hex');
  }

  private hashRefreshToken(token: string): string {
    const secret = this.getRequiredString('REFRESH_TOKEN_HASH_SECRET');
    return createHmac('sha256', secret).update(token).digest('hex');
  }

  private getRequiredString(key: keyof Env): string {
    const value = this.configService.get(key, { infer: true });
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Missing required configuration: ${String(key)}`);
    }
    return value;
  }

  private getOtpForCurrentEnvironment(): string {
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    const devMode = this.configService.get('OTP_DEV_MODE', { infer: true });
    const fixedCode = this.configService.get('OTP_DEV_FIXED_CODE', { infer: true });

    if (nodeEnv === 'development' && devMode && typeof fixedCode === 'string' && /^\d{6}$/.test(fixedCode)) {
      return fixedCode;
    }

    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private safeHashMatch(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private async auditVerifyFailed(phone: string, reason: string): Promise<void> {
    await this.auditService.write({
      event: 'AUTH_VERIFY_OTP_FAILED',
      actorType: 'SYSTEM',
      actorId: 'SYSTEM',
      metadata: {
        phone,
        reason
      }
    });
  }

  private unauthorized(code: string, message: string): UnauthorizedException {
    return new UnauthorizedException({
      code,
      message,
      details: null
    });
  }

  private async enforceBorrowerLoginRateLimit(ip: string | null): Promise<void> {
    if (!ip) {
      return;
    }

    const max = this.configService.get('BORROWER_LOGIN_RATE_LIMIT_IP_MAX', { infer: true });
    const windowSec = this.configService.get('BORROWER_LOGIN_RATE_LIMIT_IP_WINDOW_SEC', { infer: true });
    const count = await this.redisService.incrementWithWindow(`rl:borrower:login:ip:${ip}`, windowSec);
    if (count > max) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Please try again later.',
          details: {
            reason: 'borrower_login_rate_limit'
          }
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  
  private async enforceRefreshRateLimit(ip: string | null): Promise<void> {
    if (!ip) {
      return;
    }

    const max = this.configService.get('REFRESH_RATE_LIMIT_IP_MAX', { infer: true });
    const windowSec = this.configService.get('REFRESH_RATE_LIMIT_IP_WINDOW_SEC', { infer: true });
    const count = await this.redisService.incrementWithWindow(`rl:refresh:borrower:ip:${ip}`, windowSec);
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
}

