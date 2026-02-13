import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import { pino } from 'pino';
import type { Env } from '../config/env.schema';

type RequestLike = IncomingMessage & {
  requestId?: string;
  user?: {
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
      return {
        requestId: request.requestId ?? 'unknown',
        borrowerId: request.user?.borrowerId ?? null,
        adminId: request.user?.adminId ?? null
      };
    }
  };
}
