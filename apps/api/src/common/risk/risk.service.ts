import { createHash } from 'node:crypto';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { BlacklistEntryType, RiskLevel } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RequestContextService } from '../request-context/request-context.service';
import type { RequestWithId } from '../types/request-with-id';

type RiskInput = {
  lenderId: string;
  borrowerId?: string;
  phone?: string;
  bvnLast4?: string;
  deviceId?: string;
  eventType: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

type RiskResult = {
  blocked: boolean;
  reason: string | null;
  score: number;
  level: RiskLevel;
  resolvedDeviceId: string;
};

@Injectable({ scope: Scope.REQUEST })
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly requestContextService: RequestContextService,
    @Inject(REQUEST) private readonly request: RequestWithId
  ) {}

  async evaluate(input: RiskInput): Promise<RiskResult> {
    const context = this.requestContextService.get();
    const resolvedDeviceId = this.resolveDeviceId(input.deviceId, context.ip, context.userAgent);
    const ip = context.ip;

    const blacklist = await this.checkBlacklist({
      lenderId: input.lenderId,
      phone: input.phone,
      bvnLast4: input.bvnLast4,
      deviceId: resolvedDeviceId,
      ip
    });

    const velocityBlocked = await this.isVelocityBlocked(input.lenderId, input.phone, resolvedDeviceId, ip);

    const scoreDelta = (blacklist.blocked ? 100 : 0) + (velocityBlocked ? 40 : 0) + 1;
    let totalScore = scoreDelta;
    let level: RiskLevel = this.levelForScore(scoreDelta);

    if (input.borrowerId) {
      const existing = await this.prisma.borrowerRiskProfile.findUnique({
        where: { borrowerId: input.borrowerId }
      });
      totalScore = (existing?.score ?? 0) + scoreDelta;
      level = this.levelForScore(totalScore);

      await this.prisma.borrowerRiskProfile.upsert({
        where: { borrowerId: input.borrowerId },
        update: {
          score: totalScore,
          level,
          lastEvaluatedAt: new Date()
        },
        create: {
          lenderId: input.lenderId,
          borrowerId: input.borrowerId,
          score: totalScore,
          level,
          lastEvaluatedAt: new Date()
        }
      });
    }

    const trackedDevice = await this.trackDevice(input.lenderId, input.borrowerId, resolvedDeviceId);

    const blocked = blacklist.blocked || velocityBlocked || level === 'HIGH';
    const reason = blacklist.reason ?? (velocityBlocked ? 'VELOCITY' : level === 'HIGH' ? 'HIGH_RISK' : null);

    await this.prisma.riskEvent.create({
      data: {
        lenderId: input.lenderId,
        borrowerId: input.borrowerId ?? null,
        deviceId: trackedDevice.id,
        eventType: input.eventType,
        scoreDelta,
        totalScore,
        level,
        blocked,
        reason: reason ?? input.reason ?? null,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
      }
    });

    return {
      blocked,
      reason,
      score: totalScore,
      level,
      resolvedDeviceId
    };
  }

  async checkBlacklist(input: {
    lenderId: string;
    phone?: string;
    bvnLast4?: string;
    deviceId?: string;
    ip?: string | null;
  }): Promise<{ blocked: boolean; reason: string | null }> {
    const candidates: Array<{ type: BlacklistEntryType; value?: string | null }> = [
      { type: 'PHONE', value: input.phone },
      { type: 'BVN_LAST4', value: input.bvnLast4 },
      { type: 'DEVICE_ID', value: input.deviceId },
      { type: 'IP', value: input.ip }
    ];

    for (const candidate of candidates) {
      const value = candidate.value?.trim();
      if (!value) {
        continue;
      }

      const entry = await this.prisma.blacklistEntry.findFirst({
        where: {
          type: candidate.type,
          value,
          isActive: true,
          OR: [{ lenderId: input.lenderId }, { lenderId: null }]
        }
      });

      if (entry) {
        return { blocked: true, reason: `BLACKLIST_${candidate.type}` };
      }
    }

    return { blocked: false, reason: null };
  }

  async getBorrowerRisk(lenderId: string, borrowerId: string) {
    const [profile, recentEvents, devices] = await Promise.all([
      this.prisma.borrowerRiskProfile.findFirst({
        where: { lenderId, borrowerId }
      }),
      this.prisma.riskEvent.findMany({
        where: { lenderId, borrowerId },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      this.prisma.device.findMany({
        where: { lenderId, borrowerId },
        orderBy: { lastSeenAt: 'desc' },
        take: 10
      })
    ]);

    return { profile, recentEvents, devices };
  }

  private async isVelocityBlocked(
    lenderId: string,
    phone: string | undefined,
    deviceId: string,
    ip: string | null
  ): Promise<boolean> {
    const checks: Array<{ key: string; limit: number; windowSec: number }> = [];
    if (phone) {
      checks.push({ key: `risk:vel:${lenderId}:phone:${phone}`, limit: 8, windowSec: 600 });
    }
    if (ip) {
      checks.push({ key: `risk:vel:${lenderId}:ip:${ip}`, limit: 20, windowSec: 600 });
    }
    checks.push({ key: `risk:vel:${lenderId}:device:${deviceId}`, limit: 12, windowSec: 600 });

    for (const check of checks) {
      const count = await this.redisService.incrementWithWindow(check.key, check.windowSec);
      if (count > check.limit) {
        return true;
      }
    }

    return false;
  }

  private async trackDevice(lenderId: string, borrowerId: string | undefined, deviceId: string) {
    const context = this.requestContextService.get();
    const fingerprint = this.buildFingerprint(context.ip, context.userAgent);

    return this.prisma.device.upsert({
      where: {
        lenderId_deviceId: {
          lenderId,
          deviceId
        }
      },
      update: {
        borrowerId: borrowerId ?? undefined,
        ip: context.ip,
        userAgent: context.userAgent,
        fingerprint,
        lastSeenAt: new Date()
      },
      create: {
        lenderId,
        borrowerId: borrowerId ?? null,
        deviceId,
        ip: context.ip,
        userAgent: context.userAgent,
        fingerprint,
        lastSeenAt: new Date()
      }
    });
  }

  private resolveDeviceId(inputDeviceId: string | undefined, ip: string | null, ua: string | null): string {
    const headerDeviceId = this.request.header('x-device-id') ?? undefined;
    const candidate = inputDeviceId?.trim() || headerDeviceId?.trim();
    if (candidate) {
      return candidate;
    }
    return this.buildFingerprint(ip, ua);
  }

  private buildFingerprint(ip: string | null, ua: string | null): string {
    const source = `${ip ?? 'na'}|${ua ?? 'na'}`;
    return createHash('sha256').update(source).digest('hex').slice(0, 32);
  }

  private levelForScore(score: number): RiskLevel {
    if (score >= 80) {
      return 'HIGH';
    }
    if (score >= 30) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}
