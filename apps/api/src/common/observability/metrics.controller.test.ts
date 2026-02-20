import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { MetricsController } from './metrics.controller';

test('/metrics requires x-metrics-token', async () => {
  const controller = new MetricsController(
    { renderPrometheus: () => 'ok\n' } as any,
    { get: () => 'secret_token' } as any
  );

  await assert.rejects(
    () =>
      controller.getMetrics(
        {
          header: () => undefined,
          requestId: 'req_1'
        } as any,
        { setHeader: () => undefined } as any
      ),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test('/metrics returns Prometheus payload with valid token', async () => {
  const controller = new MetricsController(
    { renderPrometheus: () => 'http_requests_total 1\n' } as any,
    { get: () => 'secret_token' } as any
  );

  const output = await controller.getMetrics(
    {
      header: (name: string) => (name.toLowerCase() === 'x-metrics-token' ? 'secret_token' : undefined),
      requestId: 'req_2'
    } as any,
    { setHeader: () => undefined } as any
  );

  assert.equal(output, 'http_requests_total 1\n');
});
