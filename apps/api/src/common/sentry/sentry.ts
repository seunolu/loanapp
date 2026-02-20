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

    const user = req.user as
      | { tenantId?: string; adminId?: string; borrowerId?: string; role?: string }
      | undefined;
    if (user?.tenantId) {
      scope.setTag('tenantId', user.tenantId);
    }
    const actorType = user?.adminId ? 'TENANT_ADMIN' : user?.borrowerId ? 'BORROWER' : user ? 'SYSTEM' : null;
    if (actorType) {
      scope.setTag('actorType', actorType);
    }
    const actorId = user?.adminId ?? user?.borrowerId;
    if (actorId) {
      scope.setTag('actorId', actorId);
    }
    if (user?.role) {
      scope.setTag('actorRole', user.role);
    }

    Sentry.captureException(exception);
  });
}
