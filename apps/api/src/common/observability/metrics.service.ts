import { Injectable } from '@nestjs/common';
import { MetricsService as BaseMetricsService } from '../metrics/metrics.service';

export type CounterMetricName =
  | 'loan_application_submitted_total'
  | 'loan_application_approved_total'
  | 'disbursement_executed_total'
  | 'repayment_applied_total'
  | 'transition_failed_total'
  | 'idempotency_conflict_total'
  | 'loan_transition_total'
  | 'risk_evaluation_total'
  | 'worker_execution_total';

export type LatencyMetricName =
  | 'disbursement_execution_latency_ms'
  | 'repayment_application_latency_ms'
  | 'transition_execution_latency_ms'
  | 'risk_evaluation_latency_ms'
  | 'worker_execution_latency_ms';

@Injectable()
export class MetricsService extends BaseMetricsService {
  increment(metric: CounterMetricName, tenantId: string, delta = 1): void {
    this.incrementCounter(metric, { tenantId }, delta);
  }

  observeLatency(metric: LatencyMetricName, tenantId: string, valueMs: number): void {
    this.recordDuration(metric, valueMs, { tenantId });
  }

  getTenantMetrics(tenantId: string) {
    const snapshot = this.snapshot();
    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      counters: snapshot.counters.filter((entry) => entry.key.includes(`tenantId=${tenantId}`)),
      durations: snapshot.durations.filter((entry) => String(entry.labels.tenantId ?? '') === tenantId)
    };
  }
}
