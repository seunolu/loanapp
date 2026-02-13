import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../../app.module';
import { JobsSchedulerService } from './jobs-scheduler.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true
  });
  app.useLogger(app.get(Logger));

  const scheduler = app.get(JobsSchedulerService);
  const arg = process.argv[2];
  const date = arg ? new Date(arg) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid schedule date: ${arg}`);
  }

  await scheduler.scheduleDaily(date);
  await app.close();
}

void bootstrap();
