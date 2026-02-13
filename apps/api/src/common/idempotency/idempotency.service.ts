import { createHash } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { IdempotencyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type IdempotencyLookupParams = {
  key: string;
  method: string;
  path: string;
  body: unknown;
};

type IdempotencyDecision =
  | { kind: 'execute'; recordId: string }
  | { kind: 'replay'; statusCode: number; responseBody: unknown };

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  hashRequest(method: string, path: string, body: unknown): string {
    const payload = `${method.toUpperCase()}:${path}:${this.stableStringify(body ?? null)}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  async evaluateRequest(params: IdempotencyLookupParams): Promise<IdempotencyDecision> {
    const method = params.method.toUpperCase();
    const requestHash = this.hashRequest(method, params.path, params.body);

    const existing = await this.findByKey(params.key, method, params.path);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_KEY_CONFLICT',
          message: 'Idempotency-Key was already used with a different request payload.',
          details: {
            key: params.key
          }
        });
      }

      if (existing.status === IdempotencyStatus.COMPLETED) {
        return {
          kind: 'replay',
          statusCode: existing.responseStatus ?? 200,
          responseBody: existing.responseBody
        };
      }

      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_IN_PROGRESS',
        message: 'A request with this Idempotency-Key is still in progress.',
        details: {
          key: params.key
        }
      });
    }

    const pending = await this.createPending(params.key, method, params.path, requestHash);

    if (!pending.created) {
      if (pending.record.requestHash !== requestHash) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_KEY_CONFLICT',
          message: 'Idempotency-Key was already used with a different request payload.',
          details: {
            key: params.key
          }
        });
      }

      if (pending.record.status === IdempotencyStatus.COMPLETED) {
        return {
          kind: 'replay',
          statusCode: pending.record.responseStatus ?? 200,
          responseBody: pending.record.responseBody
        };
      }

      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_IN_PROGRESS',
        message: 'A request with this Idempotency-Key is still in progress.',
        details: {
          key: params.key
        }
      });
    }

    return { kind: 'execute', recordId: pending.record.id };
  }

  async markCompleted(recordId: string, statusCode: number, responseBody: unknown): Promise<void> {
    const jsonValue: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
      responseBody === null || responseBody === undefined
        ? Prisma.JsonNull
        : (responseBody as Prisma.InputJsonValue);

    await this.prisma.idempotencyKey.update({
      where: { id: recordId },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responseStatus: statusCode,
        responseBody: jsonValue
      }
    });
  }

  async clearPending(recordId: string): Promise<void> {
    await this.prisma.idempotencyKey.deleteMany({
      where: {
        id: recordId,
        status: IdempotencyStatus.PENDING
      }
    });
  }

  private async findByKey(key: string, method: string, path: string) {
    return this.prisma.idempotencyKey.findUnique({
      where: {
        key_requestMethod_requestPath: {
          key,
          requestMethod: method,
          requestPath: path
        }
      }
    });
  }

  private async createPending(key: string, method: string, path: string, requestHash: string) {
    try {
      const record = await this.prisma.idempotencyKey.create({
        data: {
          key,
          requestMethod: method,
          requestPath: path,
          requestHash,
          status: IdempotencyStatus.PENDING
        }
      });
      return { record, created: true as const };
    } catch {
      const existing = await this.findByKey(key, method, path);
      if (!existing) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CREATE_FAILED',
          message: 'Unable to establish idempotency lock.',
          details: null
        });
      }

      return { record: existing, created: false as const };
    }
  }

  private stableStringify(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (Array.isArray(value)) {
      const items = value.map((item) => this.stableStringify(item));
      return `[${items.join(',')}]`;
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      const keys = Object.keys(objectValue).sort();
      const entries = keys.map((key) => `${JSON.stringify(key)}:${this.stableStringify(objectValue[key])}`);
      return `{${entries.join(',')}}`;
    }

    return JSON.stringify(value);
  }
}
