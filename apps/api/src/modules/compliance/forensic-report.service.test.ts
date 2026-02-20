import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForensicReportService } from './forensic-report.service';

test('forensic report assembles all sections and chronological timeline', async () => {
  const service = new ForensicReportService(
    {
      tenantLoanApplication: {
        findFirst: async () => ({ id: 'loan_1', tenantId: 'tenant_1', status: 'DISBURSED' })
      },
      loanApplicationStatusHistory: {
        findMany: async () => [{ id: 'h1', changedAt: new Date('2026-02-01T10:00:00Z') }]
      },
      tenantDisbursement: {
        findMany: async () => [{ id: 'd1', createdAt: new Date('2026-02-01T12:00:00Z') }]
      },
      loanRepayment: {
        findMany: async () => [{ id: 'r1', postedAt: new Date('2026-02-02T10:00:00Z') }]
      },
      tenantLedgerEntry: {
        findMany: async () => [{ id: 'l1', occurredAt: new Date('2026-02-01T12:00:00Z'), lines: [] }]
      },
      auditEvent: {
        findMany: async () => [{ id: 'a1', createdAt: new Date('2026-02-03T10:00:00Z') }]
      },
      fraudSignal: {
        findMany: async () => [{ id: 'f1', createdAt: new Date('2026-02-02T12:00:00Z') }]
      },
      capitalAllocation: {
        findMany: async () => [{ id: 'c1', createdAt: new Date('2026-02-01T09:00:00Z') }]
      }
    } as any
  );

  const result = await service.getLoanForensicReport(
    { tenantId: 'tenant_1', role: 'SUPER_ADMIN', adminId: 'admin_1', email: 'a@a.com' } as any,
    'loan_1'
  );

  assert.equal(result.loan.id, 'loan_1');
  assert.equal(result.statusHistory.length, 1);
  assert.equal(result.disbursements.length, 1);
  assert.equal(result.repayments.length, 1);
  assert.equal(result.ledgerEntries.length, 1);
  assert.equal(result.auditTrail.length, 1);
  assert.equal(result.riskEvents.length, 1);
  assert.equal(result.treasuryAllocations.length, 1);
  assert.equal(result.timeline[0].id, 'c1');
  assert.equal(result.timeline[result.timeline.length - 1].id, 'a1');
});

