import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { captureApiException } from '../sentry/sentry';
import type { RequestWithId } from '../types/request-with-id';

type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details: unknown;
    requestId: string;
  };
};

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithId>();
    const res = ctx.getResponse<Response>();

    const requestId = req.requestId ?? req.header('x-request-id') ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      code = this.httpStatusToCode(status);

      if (typeof response === 'string') {
        message = response;
      } else if (response && typeof response === 'object') {
        const body = response as {
          code?: unknown;
          message?: unknown;
          details?: unknown;
          error?: unknown;
        };

        if (typeof body.code === 'string' && body.code.trim()) {
          code = body.code;
        }

        if (Array.isArray(body.message)) {
          message = 'Validation failed';
          details = body.message;
        } else if (typeof body.message === 'string' && body.message.trim()) {
          message = body.message;
        } else if (typeof body.error === 'string' && body.error.trim()) {
          message = body.error;
        }

        if (body.details !== undefined) {
          details = body.details;
        }
      }
    } else if (exception instanceof Error && exception.message.trim()) {
      message = exception.message;
    }

    const payload: ErrorEnvelope = {
      error: {
        code,
        message,
        details,
        requestId
      }
    };

    captureApiException(exception, req);

    this.logger.error(
      {
        requestId,
        errorCode: code,
        statusCode: status,
        errorDetails: details,
        stack: exception instanceof Error ? exception.stack : undefined
      },
      message
    );

    res.setHeader('X-Request-Id', requestId);
    res.status(status).json(payload);
  }

  private httpStatusToCode(status: number): string {
    const key = HttpStatus[status];
    return typeof key === 'string' ? key : `HTTP_${status}`;
  }
}
