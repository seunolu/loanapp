import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics
} from 'prom-client';

type QueueDepth = {
  pending: number;
  processing: number;
  failed: number;
  delayed: number;
};

@Injectable()
export class PromMetricsService {
  private static registry: Registry | null = null;
  private static initialized = false;

  private readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<'route' | 'method' | 'status'>;
  private readonly httpRequestDurationSeconds: Histogram<'route' | 'method' | 'status'>;
  private readonly authEventsTotal: Counter<'action' | 'result'>;
  private readonly dbQueryErrorsTotal: Counter<'error_code'>;
  private readonly loanTransitionsTotal: Counter<'from' | 'to'>;
  private readonly jobsEnqueuedTotal: Counter<'queue' | 'name'>;
  private readonly jobsFailedTotal: Counter<'queue' | 'name'>;
  private readonly queueJobsTotal: Counter<'type'>;
  private readonly queueJobsFailedTotal: Counter<'type'>;
  private readonly queueDepthGauge: Gauge<'status'>;
  private readonly ledgerPostingsTotal: Counter<'tenantId' | 'entryType'>;
  private readonly mandateDebitsTotal: Counter<'tenantId' | 'status'>;
  private readonly paymentSuccessTotal: Counter<'tenantId' | 'direction'>;
  private readonly paymentFailedTotal: Counter<'tenantId' | 'direction'>;
  private readonly auditEventsTotal: Counter<'tenantId' | 'action' | 'severity'>;
  private readonly auditFailuresTotal: Counter<'tenantId' | 'action'>;
  private readonly auditChainRotationsTotal: Counter<'tenantId'>;
  private readonly auditWriteDurationMs: Histogram<'scope'>;
  private readonly outboxPublishedTotal: Counter<'eventType'>;
  private readonly outboxPublishFailedTotal: Counter<'eventType'>;
  private readonly ledgerReconcileMismatchesTotal: Counter<'tenantId'>;

  constructor() {
    if (!PromMetricsService.registry) {
      PromMetricsService.registry = new Registry();
    }
    this.registry = PromMetricsService.registry;

    if (!PromMetricsService.initialized) {
      collectDefaultMetrics({ register: this.registry, prefix: 'loanapp_' });
      PromMetricsService.initialized = true;
    }

    this.httpRequestsTotal = this.getOrCreateCounter('http_requests_total', 'HTTP requests total', [
      'route',
      'method',
      'status'
    ]);
    this.httpRequestDurationSeconds = this.getOrCreateHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      ['route', 'method', 'status'],
      [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]
    );
    this.authEventsTotal = this.getOrCreateCounter('auth_events_total', 'Auth login/refresh events', ['action', 'result']);
    this.dbQueryErrorsTotal = this.getOrCreateCounter('db_query_errors_total', 'DB query failures', ['error_code']);
    this.loanTransitionsTotal = this.getOrCreateCounter('loan_transitions_total', 'Loan transitions', ['from', 'to']);
    this.jobsEnqueuedTotal = this.getOrCreateCounter('jobs_enqueued_total', 'Jobs enqueued', ['queue', 'name']);
    this.jobsFailedTotal = this.getOrCreateCounter('jobs_failed_total', 'Jobs failed', ['queue', 'name']);
    this.queueJobsTotal = this.getOrCreateCounter('queue_jobs_total', 'Queue jobs total', ['type']);
    this.queueJobsFailedTotal = this.getOrCreateCounter('queue_jobs_failed_total', 'Queue jobs failed total', ['type']);
    this.queueDepthGauge = this.getOrCreateGauge('queue_depth', 'Queue depth by status', ['status']);
    this.ledgerPostingsTotal = this.getOrCreateCounter('ledger_postings_total', 'Ledger postings total', [
      'tenantId',
      'entryType'
    ]);
    this.mandateDebitsTotal = this.getOrCreateCounter('mandate_debits_total', 'Mandate debits total', [
      'tenantId',
      'status'
    ]);
    this.paymentSuccessTotal = this.getOrCreateCounter('payment_success_total', 'Payment success total', [
      'tenantId',
      'direction'
    ]);
    this.paymentFailedTotal = this.getOrCreateCounter('payment_failed_total', 'Payment failed total', [
      'tenantId',
      'direction'
    ]);
    this.auditEventsTotal = this.getOrCreateCounter('audit_events_total', 'Audit events total', [
      'tenantId',
      'action',
      'severity'
    ]);
    this.auditFailuresTotal = this.getOrCreateCounter('audit_failures_total', 'Audit failures total', [
      'tenantId',
      'action'
    ]);
    this.auditChainRotationsTotal = this.getOrCreateCounter('audit_chain_rotations_total', 'Audit chain rotations', [
      'tenantId'
    ]);
    this.auditWriteDurationMs = this.getOrCreateHistogram(
      'audit_write_duration_ms',
      'Audit write duration in ms',
      ['scope'],
      [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
    );
    this.outboxPublishedTotal = this.getOrCreateCounter('outbox_published_total', 'Outbox published total', [
      'eventType'
    ]);
    this.outboxPublishFailedTotal = this.getOrCreateCounter(
      'outbox_publish_failed_total',
      'Outbox publish failures total',
      ['eventType']
    );
    this.ledgerReconcileMismatchesTotal = this.getOrCreateCounter(
      'ledger_reconcile_mismatches_total',
      'Ledger reconcile mismatches total',
      ['tenantId']
    );
  }

  observeHttpRequest(method: string, route: string, status: number, durationMs: number): void {
    const labels = {
      method: this.sanitize(method.toUpperCase()),
      route: this.sanitize(route || 'unknown'),
      status: this.sanitize(String(status))
    };
    this.httpRequestsTotal.inc(labels, 1);
    this.httpRequestDurationSeconds.observe(labels, Math.max(0, durationMs) / 1000);
  }

  incrementAuthEvent(action: 'login' | 'refresh', result: 'success' | 'fail'): void {
    this.authEventsTotal.inc({ action, result }, 1);
  }

  incrementDbQueryError(errorCode: string): void {
    this.dbQueryErrorsTotal.inc({ error_code: this.sanitize(errorCode || 'UNKNOWN') }, 1);
  }

  incrementLoanTransition(from: string, to: string): void {
    this.loanTransitionsTotal.inc({ from: this.sanitize(from), to: this.sanitize(to) }, 1);
  }

  incrementJobsEnqueued(queue: string, name: string): void {
    const type = this.sanitize(name);
    this.jobsEnqueuedTotal.inc({ queue: this.sanitize(queue), name: type }, 1);
    this.queueJobsTotal.inc({ type }, 1);
  }

  incrementJobsFailed(queue: string, name: string): void {
    const type = this.sanitize(name);
    this.jobsFailedTotal.inc({ queue: this.sanitize(queue), name: type }, 1);
    this.queueJobsFailedTotal.inc({ type }, 1);
  }

  setQueueDepth(depth: QueueDepth): void {
    this.queueDepthGauge.set({ status: 'pending' }, Math.max(0, depth.pending));
    this.queueDepthGauge.set({ status: 'processing' }, Math.max(0, depth.processing));
    this.queueDepthGauge.set({ status: 'failed' }, Math.max(0, depth.failed));
    this.queueDepthGauge.set({ status: 'delayed' }, Math.max(0, depth.delayed));
  }

  incrementLedgerPosting(tenantId: string, entryType: string): void {
    this.ledgerPostingsTotal.inc({ tenantId: this.sanitize(tenantId), entryType: this.sanitize(entryType) }, 1);
  }

  incrementMandateDebit(tenantId: string, status: string): void {
    this.mandateDebitsTotal.inc({ tenantId: this.sanitize(tenantId), status: this.sanitize(status) }, 1);
  }

  incrementPaymentSuccess(tenantId: string, direction: string): void {
    this.paymentSuccessTotal.inc({ tenantId: this.sanitize(tenantId), direction: this.sanitize(direction) }, 1);
  }

  incrementPaymentFailed(tenantId: string, direction: string): void {
    this.paymentFailedTotal.inc({ tenantId: this.sanitize(tenantId), direction: this.sanitize(direction) }, 1);
  }

  incrementAuditEvent(tenantId: string, action: string, severity: string): void {
    this.auditEventsTotal.inc(
      {
        tenantId: this.sanitize(tenantId),
        action: this.sanitize(action),
        severity: this.sanitize(severity)
      },
      1
    );
  }

  incrementAuditFailure(tenantId: string, action: string): void {
    this.auditFailuresTotal.inc({ tenantId: this.sanitize(tenantId), action: this.sanitize(action) }, 1);
  }

  incrementAuditChainRotation(tenantId: string): void {
    this.auditChainRotationsTotal.inc({ tenantId: this.sanitize(tenantId) }, 1);
  }

  observeAuditWriteDuration(durationMs: number): void {
    this.auditWriteDurationMs.observe({ scope: 'global' }, Math.max(0, durationMs));
  }

  incrementOutboxPublished(eventType: string): void {
    this.outboxPublishedTotal.inc({ eventType: this.sanitize(eventType || 'unknown') }, 1);
  }

  incrementOutboxPublishFailed(eventType: string): void {
    this.outboxPublishFailedTotal.inc({ eventType: this.sanitize(eventType || 'unknown') }, 1);
  }

  incrementLedgerReconcileMismatch(tenantId: string): void {
    this.ledgerReconcileMismatchesTotal.inc({ tenantId: this.sanitize(tenantId) }, 1);
  }

  async renderPrometheus(): Promise<string> {
    return this.registry.metrics();
  }

  private sanitize(value: string): string {
    return value.trim().length > 0 ? value.trim() : 'unknown';
  }

  private getOrCreateCounter<T extends string>(
    name: string,
    help: string,
    labelNames: T[]
  ): Counter<T> {
    const existing = this.registry.getSingleMetric(name) as Counter<T> | undefined;
    if (existing) return existing;
    return new Counter({
      name,
      help,
      labelNames,
      registers: [this.registry]
    });
  }

  private getOrCreateHistogram<T extends string>(
    name: string,
    help: string,
    labelNames: T[],
    buckets: number[]
  ): Histogram<T> {
    const existing = this.registry.getSingleMetric(name) as Histogram<T> | undefined;
    if (existing) return existing;
    return new Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [this.registry]
    });
  }

  private getOrCreateGauge<T extends string>(name: string, help: string, labelNames: T[]): Gauge<T> {
    const existing = this.registry.getSingleMetric(name) as Gauge<T> | undefined;
    if (existing) return existing;
    return new Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry]
    });
  }
}

