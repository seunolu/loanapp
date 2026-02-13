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
import { initApiSentry } from './common/sentry/sentry';
import type { RequestWithId } from './common/types/request-with-id';

function parseAllowedOrigins(csv: string): string[] {
  return csv
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
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
  const corsCredentials = configService.get('CORS_ALLOW_CREDENTIALS', { infer: true });
  const corsOrigins = parseAllowedOrigins(configService.get('CORS_ALLOWED_ORIGINS', { infer: true }));

  if (nodeEnv === 'production' && (corsOrigins.length === 0 || corsOrigins.includes('*'))) {
    throw new Error('CORS_ALLOWED_ORIGINS must be explicit (no wildcard) in production.');
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: false
    })
  );
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (nodeEnv !== 'production' && corsOrigins.includes('*')) {
        callback(null, true);
        return;
      }

      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: corsCredentials
  });

  const webhookPathPrefix = `/${apiPrefix}/webhooks/paystack`;
  const captureRawBody = (req: RequestWithId, buffer: Buffer): void => {
    if (req.originalUrl.startsWith(webhookPathPrefix)) {
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

  app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  app.useGlobalFilters(app.get(GlobalExceptionFilter));

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
  await app.listen(port);
}

void bootstrap();
