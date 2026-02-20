import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import type { Env } from '../config/env.schema';
import { RedisService } from '../redis/redis.service';

type ConfirmationPayload = {
  purpose: string;
  resourceId: string | null;
  tenantId: string;
  adminId: string;
  issuedAt: string;
};

@Injectable()
export class AdminConfirmationService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<Env, true>,
    private readonly auditService: AuditService
  ) {}

  async issueToken(input: {
    purpose: string;
    resourceId?: string | null;
    tenantId: string;
    adminId: string;
    adminRole: string;
    requestId?: string | null;
  }): Promise<{ token: string; expiresAt: string }> {
    const ttlSeconds = Number(this.configService.get('ADMIN_CONFIRMATION_TTL_SECONDS', { infer: true }) ?? 120);
    const token = randomUUID();
    const payload: ConfirmationPayload = {
      purpose: input.purpose,
      resourceId: input.resourceId ?? null,
      tenantId: input.tenantId,
      adminId: input.adminId,
      issuedAt: new Date().toISOString()
    };
    await this.redisService.getClient().set(`admin:confirm:${token}`, JSON.stringify(payload), 'EX', ttlSeconds);
    await this.auditService.log({
      tenantId: input.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: input.adminId,
      actorRole: input.adminRole,
      action: 'ADMIN_CONFIRMATION.ISSUED',
      entity: 'AdminConfirmation',
      entityId: token,
      metadata: {
        purpose: input.purpose,
        resourceId: input.resourceId ?? null,
        ttlSeconds
      }
    });
    return {
      token,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
    };
  }

  async consumeOrThrow(input: {
    token: string | null | undefined;
    purpose: string;
    resourceId?: string | null;
    tenantId: string;
    adminId: string;
    adminRole: string;
  }): Promise<void> {
    const token = input.token?.trim();
    if (!token) {
      this.throwRequired(input.purpose, input.resourceId ?? null);
    }
    const key = `admin:confirm:${token}`;
    const raw = await this.redisService.getClient().get(key);
    if (!raw) {
      this.throwRequired(input.purpose, input.resourceId ?? null);
    }
    let payload: ConfirmationPayload;
    try {
      payload = JSON.parse(raw) as ConfirmationPayload;
    } catch {
      await this.redisService.delete(key);
      this.throwRequired(input.purpose, input.resourceId ?? null);
    }
    const sameResource =
      (payload.resourceId ?? null) === (input.resourceId ?? null) ||
      payload.resourceId == null ||
      input.resourceId == null;
    const valid =
      payload.purpose === input.purpose &&
      payload.tenantId === input.tenantId &&
      payload.adminId === input.adminId &&
      sameResource;
    if (!valid) {
      this.throwRequired(input.purpose, input.resourceId ?? null);
    }

    await this.redisService.delete(key);
    await this.auditService.log({
      tenantId: input.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: input.adminId,
      actorRole: input.adminRole,
      action: 'ADMIN_CONFIRMATION.CONSUMED',
      entity: 'AdminConfirmation',
      entityId: token,
      metadata: {
        purpose: input.purpose,
        resourceId: input.resourceId ?? null
      }
    });
  }

  private throwRequired(purpose: string, resourceId: string | null): never {
    throw new ForbiddenException({
      code: 'CONFIRMATION_REQUIRED',
      message: 'Sensitive action requires step-up confirmation.',
      details: { purpose, resourceId }
    });
  }
}

