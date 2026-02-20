import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { TenantAdminRole, TenantLoanApplicationStatus } from '@prisma/client';
import { assertValidTransition } from './loan-application-status-transition';
import { assertRoleCanTransition, roleCanTransition } from './loan-application-transition-rbac';

test('CREDIT_OFFICER can move SUBMITTED -> UNDER_REVIEW', () => {
  const allowed = roleCanTransition({
    role: TenantAdminRole.CREDIT_OFFICER,
    from: TenantLoanApplicationStatus.SUBMITTED,
    to: TenantLoanApplicationStatus.UNDER_REVIEW
  });
  assert.equal(allowed, true);
});

test('CREDIT_OFFICER cannot move UNDER_REVIEW -> APPROVED', () => {
  const allowed = roleCanTransition({
    role: TenantAdminRole.CREDIT_OFFICER,
    from: TenantLoanApplicationStatus.UNDER_REVIEW,
    to: TenantLoanApplicationStatus.APPROVED
  });
  assert.equal(allowed, false);
});

test('RISK_MANAGER can move UNDER_REVIEW -> APPROVED', () => {
  const allowed = roleCanTransition({
    role: TenantAdminRole.RISK_MANAGER,
    from: TenantLoanApplicationStatus.UNDER_REVIEW,
    to: TenantLoanApplicationStatus.APPROVED
  });
  assert.equal(allowed, true);
});

test('OPS can move APPROVED -> DISBURSED', () => {
  const allowed = roleCanTransition({
    role: TenantAdminRole.OPS,
    from: TenantLoanApplicationStatus.APPROVED,
    to: TenantLoanApplicationStatus.DISBURSED
  });
  assert.equal(allowed, true);
});

test('assertRoleCanTransition throws for forbidden transition', () => {
  assert.throws(
    () =>
      assertRoleCanTransition({
        role: TenantAdminRole.COLLECTIONS,
        from: TenantLoanApplicationStatus.UNDER_REVIEW,
        to: TenantLoanApplicationStatus.REJECTED
      }),
    /Role COLLECTIONS cannot transition UNDER_REVIEW -> REJECTED/
  );
});

test('SUPER_ADMIN passes RBAC for valid state-machine transition', () => {
  assertValidTransition(TenantLoanApplicationStatus.UNDER_REVIEW, TenantLoanApplicationStatus.REJECTED);
  assertRoleCanTransition({
    role: TenantAdminRole.SUPER_ADMIN,
    from: TenantLoanApplicationStatus.UNDER_REVIEW,
    to: TenantLoanApplicationStatus.REJECTED
  });
});

test('SUPER_ADMIN still fails when state-machine transition is invalid', () => {
  assert.throws(
    () => {
      assertValidTransition(TenantLoanApplicationStatus.REPAID, TenantLoanApplicationStatus.APPROVED);
      assertRoleCanTransition({
        role: TenantAdminRole.SUPER_ADMIN,
        from: TenantLoanApplicationStatus.REPAID,
        to: TenantLoanApplicationStatus.APPROVED
      });
    },
    /Invalid status transition/
  );
});
