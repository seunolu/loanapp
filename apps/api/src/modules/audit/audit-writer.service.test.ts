import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuditWriterService } from './audit-writer.service';

test('audit writer records event and redacts sensitive metadata', async () => {
  let created: any = null;
  const service = new AuditWriterService(
    {
      auditEvent: {
        create: async ({ data }: { data: any }) => {
          created = data;
          return data;
        }
      }
    } as any,
    {
      get: () => ({
        requestId: 'req_1',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        tenantId: 'tenant_1',
        actorType: 'TENANT_ADMIN',
        actorId: 'admin_1',
        actorRole: 'SUPER_ADMIN'
      })
    } as any
  );

  await service.recordEvent({
    tenantId: 'tenant_1',
    action: 'TEST_ACTION',
    entityType: 'LoanApplication',
    entityId: 'loan_1',
    metadata: {
      token: 'secret-value',
      nested: { password: 'hidden' }
    }
  });

  assert.equal(created.tenantId, 'tenant_1');
  assert.equal(created.action, 'TEST_ACTION');
  assert.equal(created.requestId, 'req_1');
  assert.equal(created.ipAddress, '127.0.0.1');
  assert.equal((created.metadataJson as any).token, '[REDACTED]');
  assert.equal((created.metadataJson as any).nested.password, '[REDACTED]');
});

