import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { RequestContextStore } from '../request-context/request-context.store';

@Injectable()
export class StructuredLoggerService {
  constructor(
    private readonly pino: PinoLogger,
    private readonly requestContextStore: RequestContextStore
  ) {}

  info(message: string, metadata?: Record<string, unknown>): void {
    this.pino.info(this.withContext(metadata), message);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.pino.warn(this.withContext(metadata), message);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.pino.error(this.withContext(metadata), message);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.pino.debug(this.withContext(metadata), message);
  }

  private withContext(metadata?: Record<string, unknown>): Record<string, unknown> {
    const context = this.requestContextStore.get();
    return {
      requestId: context?.requestId ?? 'unknown',
      tenantId: context?.tenantId ?? 'unknown',
      userId: context?.userId ?? 'unknown',
      ...(metadata ?? {})
    };
  }
}

