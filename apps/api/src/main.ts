import 'reflect-metadata';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { Env } from './common/config/env.schema';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { StripTenantIdInterceptor } from './common/interceptors/strip-tenant-id.interceptor';
import { PrismaService } from './common/database/prisma.service';
import { RedisService } from './common/redis/redis.service';
import { initApiSentry } from './common/sentry/sentry';
import type { RequestWithId } from './common/types/request-with-id';

type OriginMatcher = {
  raw: string;
  test: (origin: string) => boolean;
};

function parseAllowedOrigins(csv: string): string[] {
  return csv
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildOriginMatchers(entries: string[]): { wildcard: boolean; matchers: OriginMatcher[] } {
  let wildcard = false;
  const matchers: OriginMatcher[] = [];

  for (const entry of entries) {
    if (entry === '*') {
      wildcard = true;
      continue;
    }

    // Example: http://192.168.0.0/16
    const cidrMatch = entry.match(/^(https?):\/\/(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/i);
    if (cidrMatch) {
      const [, scheme, ip, maskBitsRaw] = cidrMatch;
      const octets = ip.split('.').map(Number);
      const maskBits = Number(maskBitsRaw);
      if (octets.length === 4 && maskBits >= 8 && maskBits <= 24) {
        const fixedOctetCount = Math.floor(maskBits / 8);
        const prefix = octets.slice(0, fixedOctetCount).map((part) => escapeRegex(String(part))).join('\\.');
        const remaining = 4 - fixedOctetCount;
        const variable =
          remaining > 0
            ? `(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)){${remaining}}`
            : '';
        const regex = new RegExp(`^${scheme}:\\/\\/${prefix}${variable}(?::\\d{1,5})?$`, 'i');
        matchers.push({
          raw: entry,
          test: (origin) => regex.test(origin)
        });
        continue;
      }
    }

    if (entry.includes('*')) {
      const wildcardRegex = new RegExp(`^${entry.split('*').map(escapeRegex).join('.*')}$`, 'i');
      matchers.push({
        raw: entry,
        test: (origin) => wildcardRegex.test(origin)
      });
      continue;
    }

    matchers.push({
      raw: entry,
      test: (origin) => origin === entry
    });
  }

  return { wildcard, matchers };
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false
  });
  const configService = app.get<ConfigService<Env, true>>(ConfigService);
  initApiSentry(configService);

  app.useLogger(app.get(Logger));

  const nodeEnv = configService.get('NODE_ENV', { infer: true });
  const apiPrefix = configService.get('API_PREFIX', { infer: true });
  const bodyLimit = configService.get('REQUEST_BODY_LIMIT', { infer: true });
  const trustProxyHops = configService.get('TRUST_PROXY_HOPS', { infer: true });
  const corsCredentials = configService.get('CORS_ALLOW_CREDENTIALS', { infer: true });
  const corsOriginsCsv =
    configService.get('CORS_ORIGINS', { infer: true }) || configService.get('CORS_ALLOWED_ORIGINS', { infer: true });
  const corsOrigins = parseAllowedOrigins(corsOriginsCsv);
  const corsOriginRules = buildOriginMatchers(corsOrigins);

  if (nodeEnv === 'production' && (corsOrigins.length === 0 || corsOriginRules.wildcard)) {
    throw new Error('CORS_ORIGINS must be explicit (no wildcard) in production.');
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy:
        nodeEnv === 'production'
          ? {
              useDefaults: true,
              directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'", "'unsafe-inline'"],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", 'data:', 'https:'],
                "font-src": ["'self'", 'https:', 'data:']
              }
            }
          : false,
      hsts:
        nodeEnv === 'production'
          ? {
              maxAge: 15552000,
              includeSubDomains: true,
              preload: false
            }
          : false,
      noSniff: true,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' }
    })
  );
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', trustProxyHops);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (nodeEnv !== 'production' && corsOriginRules.wildcard) {
        callback(null, true);
        return;
      }

      if (corsOriginRules.matchers.some((matcher) => matcher.test(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: corsCredentials
  });

  const webhookPathPrefixes = [
    `/${apiPrefix}/webhooks/paystack`,
    `/${apiPrefix}/webhooks/payments`,
    `/${apiPrefix}/payments/webhooks/paystack`
  ];
  const captureRawBody = (req: RequestWithId, buffer: Buffer): void => {
    if (webhookPathPrefixes.some((prefix) => req.originalUrl.startsWith(prefix))) {
      req.rawBody = Buffer.from(buffer);
    }
  };

  app.use(
    json({
      limit: bodyLimit,
      verify: (req: RequestWithId, _res, buf) => captureRawBody(req, buf)
    })
  );
  app.use(
    urlencoded({
      limit: bodyLimit,
      extended: true,
      verify: (req: RequestWithId, _res, buf) => captureRawBody(req, buf)
    })
  );

  app.setGlobalPrefix(apiPrefix, { exclude: ['health', 'ready', 'metrics'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );

  app.useGlobalFilters(app.get(GlobalExceptionFilter));
  app.useGlobalInterceptors(new StripTenantIdInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LoanApp API')
    .setDescription('API reference for v1 bootstrap endpoints')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      'bearer'
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = configService.get('PORT', { infer: true });
  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService, { strict: false });
  const appLogger = app.get(Logger);

  const [dbConnected, redisConnected] = await Promise.all([
    prisma
      .isHealthy()
      .then((ok) => ok)
      .catch(() => false),
    redis
      ? redis
          .ping()
          .then(() => true)
          .catch(() => false)
      : Promise.resolve(false)
  ]);

  appLogger.log({
    service: 'loanapp-api',
    environment: nodeEnv,
    version: configService.get('APP_VERSION', { infer: true }),
    nodeVersion: process.version,
    redisConnected,
    dbConnected,
    timestamp: new Date().toISOString()
  });
  await app.listen(port);
}

void bootstrap();
