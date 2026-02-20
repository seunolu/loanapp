import 'reflect-metadata';
import { createServer } from 'node:http';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SystemIntegrityStatus } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { FinancialInvariantsService } from '../common/finance/financial-invariants.service';
import { Logger as PinoLogger } from 'nestjs-pino';
import { JobQueueService } from '../common/jobs/job-queue.service';
import { MetricsService } from '../common/observability/metrics.service';
import { WebhookProcessorService } from '../integrations/webhook-processor.service';
import { FraudWorkerProcessor } from '../modules/fraud/fraud-worker.processor';
import { PortfolioService } from '../modules/admin/portfolio/portfolio.service';
import { MandatesService } from '../modules/payments/mandates.service';
import { JOB_HANDLERS } from './job-handlers';
import { resolveJobTracingContext } from './job-tracing-context';
import { withRequestId } from './request-context';
import { WorkerModule } from './worker.module';
import { TreasuryService } from '../treasury/treasury.service';
import { RetentionPolicyService } from '../modules/compliance/retention-policy.service';

type WorkerMetrics = {
  processedTotal: Map<string, number>;
  failedTotal: Map<string, number>;
  durationSum: Map<string, number>;
  durationCount: Map<string, number>;
  lastSuccessTimestamp: number | null;
  processedEvents: number[];
  failedEvents: number[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function envBoolean(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw.toLowerCase() !== 'false';
}

async function runIntegrityScan(
  prisma: PrismaService,
  invariants: FinancialInvariantsService,
  logger: Logger
): Promise<void> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  for (const tenant of tenants) {
    const summary = await invariants.scanSystemInvariants(tenant.id);
    await prisma.systemIntegritySnapshot.create({
      data: {
        tenantId: tenant.id,
        checkedAt: new Date(),
        totalLoansChecked: summary.totalLoansChecked,
        failuresCount: summary.failuresCount,
        status: summary.failuresCount === 0 ? SystemIntegrityStatus.OK : SystemIntegrityStatus.FAILED,
        details: { failures: summary.failures.slice(0, 50) } as any
      }
    });
    if (summary.failuresCount > 0) {
      await (prisma as any).suspiciousActivity.createMany({
        data: summary.failures.slice(0, 20).map((failure) => ({
          tenantId: tenant.id,
          entityType: failure.loanId ? 'TENANT_LOAN_APPLICATION' : 'SYSTEM_INTEGRITY',
          entityId: failure.loanId ?? `integrity:${new Date().toISOString().slice(0, 10)}`,
          reason: `Ledger imbalance detected: ${failure.code}`,
          severity: 'HIGH'
        })),
        skipDuplicates: false
      });
    }
  }
  logger.log(`Integrity scan completed for ${tenants.length} tenant(s)`);
}

function workerIdentity(): string {
  const explicit = process.env.WORKER_ID?.trim();
  if (explicit) return explicit;
  return `worker-${Math.random().toString(36).slice(2, 10)}`;
}

function payloadObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function payloadString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' ? value : null;
}

function cleanupWindow(events: number[], nowMs: number): void {
  const threshold = nowMs - 5 * 60_000;
  while (events.length > 0 && events[0] < threshold) {
    events.shift();
  }
}

function observeProcessed(metrics: WorkerMetrics, name: string, durationMs: number): void {
  metrics.processedTotal.set(name, (metrics.processedTotal.get(name) ?? 0) + 1);
  metrics.durationSum.set(name, (metrics.durationSum.get(name) ?? 0) + Math.max(0, durationMs));
  metrics.durationCount.set(name, (metrics.durationCount.get(name) ?? 0) + 1);
  const now = Date.now();
  metrics.lastSuccessTimestamp = now;
  metrics.processedEvents.push(now);
  cleanupWindow(metrics.processedEvents, now);
}

function observeFailed(metrics: WorkerMetrics, name: string): void {
  metrics.failedTotal.set(name, (metrics.failedTotal.get(name) ?? 0) + 1);
  const now = Date.now();
  metrics.failedEvents.push(now);
  cleanupWindow(metrics.failedEvents, now);
}

function renderMetrics(metrics: WorkerMetrics): string {
  const lines: string[] = [];
  lines.push('# TYPE worker_jobs_processed_total counter');
  for (const [name, count] of metrics.processedTotal.entries()) {
    lines.push(`worker_jobs_processed_total{queue="main",name="${name}"} ${count}`);
  }

  lines.push('# TYPE worker_jobs_failed_total counter');
  for (const [name, count] of metrics.failedTotal.entries()) {
    lines.push(`worker_jobs_failed_total{queue="main",name="${name}"} ${count}`);
  }

  lines.push('# TYPE worker_job_duration_ms_avg gauge');
  for (const [name, sum] of metrics.durationSum.entries()) {
    const count = metrics.durationCount.get(name) ?? 0;
    const avg = count > 0 ? sum / count : 0;
    lines.push(`worker_job_duration_ms_avg{queue="main",name="${name}"} ${avg.toFixed(3)}`);
  }

  lines.push('# TYPE worker_last_success_timestamp gauge');
  lines.push(`worker_last_success_timestamp ${metrics.lastSuccessTimestamp ?? 0}`);

  return `${lines.join('\n')}\n`;
}

function createMetricsServer(port: number, logger: Logger, startedAtMs: number, metrics: WorkerMetrics): ReturnType<typeof createServer> {
  const server = createServer((req, res) => {
    const path = req.url ?? '/';
    if (path === '/health') {
      const now = Date.now();
      cleanupWindow(metrics.processedEvents, now);
      cleanupWindow(metrics.failedEvents, now);
      const payload = {
        status: 'ok',
        version: process.env.APP_VERSION ?? 'dev',
        uptimeSec: Math.floor((now - startedAtMs) / 1000),
        queue: {
          status: 'up',
          processedLast5Min: metrics.processedEvents.length,
          failedLast5Min: metrics.failedEvents.length
        }
      };
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
      return;
    }

    if (path === '/metrics') {
      if (!envBoolean('METRICS_ENABLED', true)) {
        res.statusCode = 404;
        res.end('metrics disabled');
        return;
      }
      res.statusCode = 200;
      res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
      res.end(renderMetrics(metrics));
      return;
    }

    res.statusCode = 404;
    res.end('not found');
  });

  server.listen(port, () => {
    logger.log(`Worker health/metrics server listening on :${port}`);
  });
  return server;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true
  });
  app.useLogger(app.get(PinoLogger));

  const logger = new Logger('BackgroundWorker');
  const queue = app.get(JobQueueService);
  const prisma = app.get(PrismaService);
  const financialInvariantsService = app.get(FinancialInvariantsService);
  const fraudWorkerProcessor = app.get(FraudWorkerProcessor);
  const webhookProcessorService = app.get(WebhookProcessorService);
  const treasuryService = app.get(TreasuryService);
  const portfolioService = app.get(PortfolioService);
  const mandatesService = app.get(MandatesService);
  const hookMetrics = app.get(MetricsService);
  const retentionPolicyService = app.get(RetentionPolicyService);

  const workerId = workerIdentity();
  const concurrency = envNumber('WORKER_CONCURRENCY', 3);
  const pollMs = envNumber('WORKER_POLL_MS', 1000);
  const workerPort = envNumber('WORKER_PORT', 3005);
  const startedAtMs = Date.now();
  const integrityScanEnabled = envBoolean('INTEGRITY_SCAN_JOB_ENABLED', true);
  const integrityScanMs = envNumber('INTEGRITY_SCAN_JOB_INTERVAL_MS', 600000);
  const fraudScanEnabled = envBoolean('FRAUD_SCAN_JOB_ENABLED', true);
  const fraudScanMs = envNumber('FRAUD_SCAN_JOB_INTERVAL_MS', 600000);
  const treasurySnapshotEnabled = envBoolean('TREASURY_SNAPSHOT_JOB_ENABLED', true);
  const treasurySnapshotMs = envNumber('TREASURY_SNAPSHOT_JOB_INTERVAL_MS', 60 * 60 * 1000);
  const portfolioSnapshotEnabled = envBoolean('PORTFOLIO_SNAPSHOT_JOB_ENABLED', true);
  const portfolioSnapshotMs = envNumber('PORTFOLIO_SNAPSHOT_JOB_INTERVAL_MS', 24 * 60 * 60 * 1000);
  const retentionPreviewEnabled = envBoolean('RETENTION_PREVIEW_JOB_ENABLED', true);
  const retentionPreviewMs = envNumber('RETENTION_PREVIEW_JOB_INTERVAL_MS', 24 * 60 * 60 * 1000);
  const metrics: WorkerMetrics = {
    processedTotal: new Map<string, number>(),
    failedTotal: new Map<string, number>(),
    durationSum: new Map<string, number>(),
    durationCount: new Map<string, number>(),
    lastSuccessTimestamp: null,
    processedEvents: [],
    failedEvents: []
  };

  let shuttingDown = false;
  let integrityTimer: NodeJS.Timeout | null = null;
  let fraudScanTimer: NodeJS.Timeout | null = null;
  let treasurySnapshotTimer: NodeJS.Timeout | null = null;
  let portfolioSnapshotTimer: NodeJS.Timeout | null = null;
  let retentionPreviewTimer: NodeJS.Timeout | null = null;
  const active = new Set<Promise<void>>();
  const healthServer = createMetricsServer(workerPort, logger, startedAtMs, metrics);

  if (integrityScanEnabled) {
    integrityTimer = setInterval(() => {
      void runIntegrityScan(prisma, financialInvariantsService, logger).catch((error) => {
        const message = error instanceof Error ? error.message : 'unknown';
        logger.error(`Integrity scan run failed: ${message}`);
      });
    }, integrityScanMs);
    void runIntegrityScan(prisma, financialInvariantsService, logger).catch((error) => {
      const message = error instanceof Error ? error.message : 'unknown';
      logger.error(`Integrity scan initial run failed: ${message}`);
    });
  }
  if (fraudScanEnabled) {
    fraudScanTimer = setInterval(() => {
      void fraudWorkerProcessor.runScan().catch((error) => {
        const message = error instanceof Error ? error.message : 'unknown';
        logger.error(`Fraud scan run failed: ${message}`);
      });
    }, fraudScanMs);
    void fraudWorkerProcessor.runScan().catch((error) => {
      const message = error instanceof Error ? error.message : 'unknown';
      logger.error(`Fraud scan initial run failed: ${message}`);
    });
  }
  if (treasurySnapshotEnabled) {
    treasurySnapshotTimer = setInterval(() => {
      void treasuryService.captureDailySnapshots().catch((error) => {
        const message = error instanceof Error ? error.message : 'unknown';
        logger.error(`Treasury snapshot run failed: ${message}`);
      });
    }, treasurySnapshotMs);
    void treasuryService.captureDailySnapshots().catch((error) => {
      const message = error instanceof Error ? error.message : 'unknown';
      logger.error(`Treasury snapshot initial run failed: ${message}`);
    });
  }
  if (portfolioSnapshotEnabled) {
    portfolioSnapshotTimer = setInterval(() => {
      void portfolioService.recomputeSnapshotsAllTenants(1).catch((error) => {
        const message = error instanceof Error ? error.message : 'unknown';
        logger.error(`Portfolio snapshot run failed: ${message}`);
      });
    }, portfolioSnapshotMs);
    void portfolioService.recomputeSnapshotsAllTenants(1).catch((error) => {
      const message = error instanceof Error ? error.message : 'unknown';
      logger.error(`Portfolio snapshot initial run failed: ${message}`);
    });
  }
  if (retentionPreviewEnabled) {
    retentionPreviewTimer = setInterval(() => {
      const plan = retentionPolicyService.buildArchivePlan();
      logger.log(`Retention preview generated entities=${plan.length}`);
    }, retentionPreviewMs);
    logger.log(`Retention preview generated entities=${retentionPolicyService.buildArchivePlan().length}`);
  }

  const stop = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`Received ${signal}, waiting for ${active.size} active job(s)`);
    if (integrityTimer) {
      clearInterval(integrityTimer);
      integrityTimer = null;
    }
    if (fraudScanTimer) {
      clearInterval(fraudScanTimer);
      fraudScanTimer = null;
    }
    if (treasurySnapshotTimer) {
      clearInterval(treasurySnapshotTimer);
      treasurySnapshotTimer = null;
    }
    if (portfolioSnapshotTimer) {
      clearInterval(portfolioSnapshotTimer);
      portfolioSnapshotTimer = null;
    }
    if (retentionPreviewTimer) {
      clearInterval(retentionPreviewTimer);
      retentionPreviewTimer = null;
    }
    await Promise.allSettled(Array.from(active));
    healthServer.close();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void stop('SIGINT');
  });
  process.on('SIGTERM', () => {
    void stop('SIGTERM');
  });

  logger.log(`Worker started id=${workerId} concurrency=${concurrency} pollMs=${pollMs}`);

  while (!shuttingDown) {
    while (!shuttingDown && active.size < concurrency) {
      const job = await queue.claimNextJob({ workerId });
      if (!job) {
        break;
      }

      const payload = payloadObject(job.payload);
      const trace = resolveJobTracingContext({
        payload,
        fallbackTenantId: job.tenantId,
        jobId: job.id,
        jobType: job.type,
        attempts: job.attempts
      });
      const requestId = trace.requestId;
      const tenantId = trace.tenantId;
      const jobLogger = withRequestId(logger, requestId);

      const task = (async () => {
        const startedAt = Date.now();
        try {
          const handler = JOB_HANDLERS[job.type];
          jobLogger.log({
            requestId,
            tenantId,
            userId: null,
            action: 'WORKER_JOB_START',
            entity: 'JOB',
            entityId: job.id,
            metadata: {
              jobId: job.id,
              jobName: job.type,
              tenantId,
              loanId: trace.loanId,
              startedAt: new Date(startedAt).toISOString(),
              attempt: trace.attempt,
              retryCount: job.attempts
            }
          });
          await handler(job, {
            logger: jobLogger,
            processWebhookEvent: (webhookEventId: string) =>
              webhookProcessorService.processWebhookEvent(webhookEventId),
            processMandateDebit: (mandateId: string) => mandatesService.processMandateDebitJob(mandateId)
          });
          await queue.markSucceeded(job.id, workerId);
          const durationMs = Date.now() - startedAt;
          observeProcessed(metrics, job.type, durationMs);
          hookMetrics.increment('worker_execution_total', tenantId);
          hookMetrics.observeLatency('worker_execution_latency_ms', tenantId, durationMs);
          jobLogger.log({
            requestId,
            tenantId,
            userId: null,
            action: 'WORKER_JOB_FINISH',
            entity: 'JOB',
            entityId: job.id,
            metadata: {
              jobId: job.id,
              jobName: job.type,
              tenantId,
              loanId: trace.loanId,
              startedAt: new Date(startedAt).toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs,
              status: 'SUCCEEDED',
              attempt: trace.attempt,
              retryCount: job.attempts
            }
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown job error';
          await queue.markFailed(job.id, workerId, message);
          observeFailed(metrics, job.type);
          const durationMs = Date.now() - startedAt;
          hookMetrics.increment('worker_execution_total', tenantId);
          hookMetrics.observeLatency('worker_execution_latency_ms', tenantId, durationMs);
          jobLogger.error({
            requestId,
            tenantId,
            userId: null,
            action: 'WORKER_JOB_FINISH',
            entity: 'JOB',
            entityId: job.id,
            metadata: {
              jobId: job.id,
              jobName: job.type,
              tenantId,
              loanId: trace.loanId,
              startedAt: new Date(startedAt).toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs,
              status: 'FAILED',
              errorType: error instanceof Error ? error.name : 'UnknownError',
              errorMessage: message,
              attempt: trace.attempt,
              retryCount: job.attempts
            }
          });
        }
      })().finally(() => {
        active.delete(task);
      });

      active.add(task);
    }

    if (shuttingDown) {
      break;
    }

    if (active.size === 0) {
      await sleep(pollMs);
      continue;
    }

    await Promise.race(Array.from(active));
  }
}

void bootstrap();
