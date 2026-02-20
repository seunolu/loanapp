import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { PinoLogger } from 'nestjs-pino';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { PromMetricsService } from '../observability/prom-metrics.service';
import { captureApiException } from '../sentry/sentry';
import type { RequestWithId } from '../types/request-with-id';

type SafeErrorPayload = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly promMetrics: PromMetricsService
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithId>();
    const res = ctx.getResponse<Response>();

    const requestId = req.requestId ?? req.id ?? req.header('x-request-id') ?? 'unknown';
    const user = req.user as { tenantId?: string; adminId?: string; borrowerId?: string; role?: string } | undefined;
    const tenantId = user?.tenantId ?? null;
    const userId = user?.adminId ?? user?.borrowerId ?? null;
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let safe = false;
    let context: unknown = null;

    if (exception instanceof AppError) {
      code = exception.code;
      message = exception.message;
      safe = exception.safe;
      context = exception.context ?? null;
      status = this.mapAppErrorStatus(code);
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Validation failed';
      safe = true;
      context = exception.flatten();
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.mapPrismaStatus(exception.code);
      code = `PRISMA_${exception.code}`;
      message = 'Database request failed';
      safe = false;
      context = exception.meta ?? null;
      this.promMetrics.incrementDbQueryError(exception.code);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'PRISMA_VALIDATION_ERROR';
      message = 'Invalid database request';
      safe = true;
      context = null;
      this.promMetrics.incrementDbQueryError('PRISMA_VALIDATION_ERROR');
    } else if (exception instanceof TokenExpiredError) {
      status = HttpStatus.UNAUTHORIZED;
      code = 'AUTH_TOKEN_EXPIRED';
      message = 'Token expired';
      safe = true;
    } else if (exception instanceof JsonWebTokenError) {
      status = HttpStatus.UNAUTHORIZED;
      code = 'AUTH_ERROR';
      message = 'Invalid token';
      safe = true;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = this.httpStatusToCode(status);
      safe = true;
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (response && typeof response === 'object') {
        const body = response as { code?: unknown; message?: unknown; details?: unknown; error?: unknown };
        if (typeof body.code === 'string' && body.code.trim()) {
          code = body.code;
        }
        if (typeof body.message === 'string' && body.message.trim()) {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = 'Validation failed';
        } else if (typeof body.error === 'string' && body.error.trim()) {
          message = body.error;
        }
        context = body.details ?? null;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      safe = false;
    }

    captureApiException(exception, req);

    this.logger.error(
      {
        requestId,
        tenantId,
        userId,
        action: 'HTTP_EXCEPTION',
        entity: 'API_REQUEST',
        entityId: req.originalUrl,
        metadata: {
          method: req.method,
          path: req.originalUrl,
          code,
          statusCode: status,
          safe,
          context,
          stack: exception instanceof Error ? exception.stack : undefined
        }
      },
      message
    );

    const payload: SafeErrorPayload = {
      error: {
        code,
        message: safe || !isProd ? message : 'Internal server error',
        requestId
      }
    };

    res.setHeader('x-request-id', requestId);
    res.status(status).json(payload);
  }

  private httpStatusToCode(status: number): string {
    const key = HttpStatus[status];
    return typeof key === 'string' ? key : `HTTP_${status}`;
  }

  private mapPrismaStatus(code: string): number {
    switch (code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2003':
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }

  private mapAppErrorStatus(code: string): number {
    switch (code) {
      case 'VALIDATION_ERROR':
        return HttpStatus.BAD_REQUEST;
      case 'AUTHORIZATION_ERROR':
        return HttpStatus.FORBIDDEN;
      case 'CONFLICT_ERROR':
      case 'DOMAIN_ERROR':
        return HttpStatus.CONFLICT;
      case 'INFRASTRUCTURE_ERROR':
        return HttpStatus.SERVICE_UNAVAILABLE;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }
}
