import * as Sentry from '@sentry/node';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import type { RequestWithId } from '../types/request-with-id';

export function initApiSentry(configService: ConfigService<Env, true>): void {
  const dsn = configService.get('SENTRY_DSN', { infer: true });
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: configService.get('SENTRY_ENVIRONMENT', { infer: true }) ?? configService.get('NODE_ENV', { infer: true }),
    tracesSampleRate: configService.get('SENTRY_TRACES_SAMPLE_RATE', { infer: true }),
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    }
  });
}

export function captureApiException(exception: unknown, req: RequestWithId): void {
  Sentry.withScope((scope) => {
    scope.setTag('requestId', req.requestId ?? req.header('x-request-id') ?? 'unknown');
    scope.setTag('route', req.route?.path ?? req.originalUrl ?? 'unknown');

    const user = req.user as { lenderId?: string } | undefined;
    const lenderIdFromHeader = req.header('x-lender-id');
    const lenderId = user?.lenderId ?? lenderIdFromHeader;
    if (lenderId) {
      scope.setTag('lenderId', lenderId);
    }

    Sentry.captureException(exception);
  });
}
