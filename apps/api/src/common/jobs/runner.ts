import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../../app.module';
import { JobsRunnerService } from './jobs-runner.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true
  });
  app.useLogger(app.get(Logger));

  const runner = app.get(JobsRunnerService);
  await runner.runLoop();
}

void bootstrap();
