import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { WebhookVerifyService } from './webhook-verify.service';

function build(overrides?: {
  verifyWebhookSignature?: (raw: string, signature: string | undefined) => boolean;
  setIfNotExists?: (key: string, value: string, ttl: number) => Promise<boolean>;
}) {
  return new WebhookVerifyService(
    {
      get: (key: string) => {
        if (key === 'WEBHOOK_ALLOWED_SKEW_SECONDS') return 300;
        if (key === 'WEBHOOK_REPLAY_TTL_SECONDS') return 604800;
        return undefined;
      }
    } as any,
    { setIfNotExists: overrides?.setIfNotExists ?? (async () => true) } as any,
    { verifyWebhookSignature: overrides?.verifyWebhookSignature ?? (() => true) } as any
  );
}

test('rejects invalid signature', async () => {
  const service = build({ verifyWebhookSignature: () => false });
  await assert.rejects(
    () =>
      service.verifyPaystackOrThrow({
        body: { event: 'charge.success', data: { id: 1, created_at: new Date().toISOString() } },
        headers: { 'x-paystack-signature': 'bad' },
        requestId: 'req_1'
      } as any),
    (error: unknown) => error instanceof UnauthorizedException
  );
});

test('rejects replayed event', async () => {
  const service = build({ setIfNotExists: async () => false });
  await assert.rejects(
    () =>
      service.verifyPaystackOrThrow({
        body: { event: 'charge.success', data: { id: 1, created_at: new Date().toISOString() } },
        headers: { 'x-paystack-signature': 'ok' },
        rawBody: Buffer.from('{}'),
        requestId: 'req_2'
      } as any),
    (error: unknown) => error instanceof ConflictException
  );
});

test('rejects stale timestamp', async () => {
  const service = build();
  await assert.rejects(
    () =>
      service.verifyPaystackOrThrow({
        body: { event: 'charge.success', data: { id: 1, created_at: '2001-01-01T00:00:00.000Z' } },
        headers: { 'x-paystack-signature': 'ok' },
        rawBody: Buffer.from('{}'),
        requestId: 'req_3'
      } as any),
    (error: unknown) => error instanceof UnauthorizedException
  );
});

