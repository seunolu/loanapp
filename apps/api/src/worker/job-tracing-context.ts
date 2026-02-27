import { randomUUID } from 'node:crypto';

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function resolveJobTracingContext(input: {
  payload: unknown;
  fallbackTenantId: string;
  jobId: string;
  jobType: string;
  attempts: number;
}) {
  const payload = asObject(input.payload);
  const requestId = typeof payload.requestId === 'string' && payload.requestId.trim() ? payload.requestId.trim() : randomUUID();
  const correlationId =
    typeof payload.correlationId === 'string' && payload.correlationId.trim()
      ? payload.correlationId.trim()
      : requestId;
  const tenantId =
    typeof payload.tenantId === 'string' && payload.tenantId.trim()
      ? payload.tenantId.trim()
      : input.fallbackTenantId;
  const loanId =
    typeof payload.loanId === 'string' && payload.loanId.trim()
      ? payload.loanId.trim()
      : typeof payload.loanApplicationId === 'string' && payload.loanApplicationId.trim()
        ? payload.loanApplicationId.trim()
        : null;

  return {
    requestId,
    correlationId,
    tenantId,
    loanId,
    jobId: input.jobId,
    jobName: input.jobType,
    attempt: input.attempts + 1
  };
}
