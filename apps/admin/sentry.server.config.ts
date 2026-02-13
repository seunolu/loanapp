import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0'),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  }
});
