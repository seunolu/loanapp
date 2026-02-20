import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import { pino } from 'pino';
import type { Env } from '../config/env.schema';

type RequestLike = IncomingMessage & {
  id?: string;
  requestId?: string;
  user?: {
    tenantId?: string;
    role?: string;
    borrowerId?: string;
    adminId?: string;
  };
};

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.otp',
  'req.body.otpCode',
  'res.headers["set-cookie"]'
];

export function buildPinoHttpConfig(configService: ConfigService<Env, true>): Params['pinoHttp'] {
  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const level = configService.get('LOG_LEVEL', { infer: true });

  return {
    logger: pino({
      level,
      redact: {
        paths: REDACT_PATHS,
        censor: '[REDACTED]'
      },
      transport:
        nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                singleLine: true
              }
            }
          : undefined
    }),
    customProps: (req: IncomingMessage, _res: ServerResponse) => {
      const request = req as RequestLike;
      const actorType = request.user?.adminId ? 'TENANT_ADMIN' : request.user?.borrowerId ? 'BORROWER' : null;
      const actorId = request.user?.adminId ?? request.user?.borrowerId ?? null;
      return {
        requestId: request.requestId ?? request.id ?? 'unknown',
        tenantId: request.user?.tenantId ?? null,
        actorType,
        actorId,
        actorRole: request.user?.role ?? null,
        context: {
          requestId: request.requestId ?? request.id ?? 'unknown',
          tenantId: request.user?.tenantId ?? null,
          actorType,
          actorId
        },
        borrowerId: request.user?.borrowerId ?? null,
        adminId: request.user?.adminId ?? null
      };
    }
  };
}
