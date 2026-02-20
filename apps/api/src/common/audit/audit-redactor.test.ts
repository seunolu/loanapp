import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { redact } from './audit-redactor';

test('redact masks sensitive keys and PII fields', () => {
  const input = {
    password: 'secret-password',
    token: 'abc123',
    email: 'johndoe@example.com',
    phone: '+2348012345678',
    bankAccountNumber: '0123456789',
    nested: {
      refreshToken: 'refresh-token',
      cardPan: '5399838383838381'
    }
  };

  const output = redact(input) as Record<string, unknown>;
  const nested = output.nested as Record<string, unknown>;

  assert.equal(output.password, '[REDACTED]');
  assert.equal(output.token, '[REDACTED]');
  assert.equal(nested.refreshToken, '[REDACTED]');
  assert.equal(output.email, 'j***e@example.com');
  assert.equal(output.phone, '234***678');
  assert.equal(output.bankAccountNumber, '****6789');
  assert.equal(nested.cardPan, '****8381');
});

