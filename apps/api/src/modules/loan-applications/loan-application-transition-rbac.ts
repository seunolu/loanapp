import { ForbiddenException } from '@nestjs/common';
import { TenantAdminRole, TenantLoanApplicationStatus } from '@prisma/client';

export type AdminRole = TenantAdminRole;
type LoanApplicationStatus = TenantLoanApplicationStatus;

function transitionKey(from: LoanApplicationStatus, to: LoanApplicationStatus): string {
  return `${from}->${to}`;
}

const ROLE_MATRIX: Record<AdminRole, Set<string>> = {
  CREDIT_OFFICER: new Set([
    transitionKey(TenantLoanApplicationStatus.SUBMITTED, TenantLoanApplicationStatus.UNDER_REVIEW),
    transitionKey(TenantLoanApplicationStatus.SUBMITTED, TenantLoanApplicationStatus.REJECTED),
    transitionKey(TenantLoanApplicationStatus.UNDER_REVIEW, TenantLoanApplicationStatus.REQUESTED_DOCUMENTS),
    transitionKey(TenantLoanApplicationStatus.REQUESTED_DOCUMENTS, TenantLoanApplicationStatus.UNDER_REVIEW),
    transitionKey(TenantLoanApplicationStatus.APPROVED, TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT)
  ]),
  RISK_MANAGER: new Set([
    transitionKey(TenantLoanApplicationStatus.UNDER_REVIEW, TenantLoanApplicationStatus.APPROVED),
    transitionKey(TenantLoanApplicationStatus.UNDER_REVIEW, TenantLoanApplicationStatus.REJECTED)
  ]),
  OPS: new Set([
    transitionKey(TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT, TenantLoanApplicationStatus.DISBURSED),
    transitionKey(TenantLoanApplicationStatus.DISBURSED, TenantLoanApplicationStatus.REPAID)
  ]),
  COLLECTIONS: new Set([
    transitionKey(TenantLoanApplicationStatus.DISBURSED, TenantLoanApplicationStatus.DEFAULTED),
    transitionKey(TenantLoanApplicationStatus.DISBURSED, TenantLoanApplicationStatus.REPAID),
    transitionKey(TenantLoanApplicationStatus.OVERDUE, TenantLoanApplicationStatus.WRITTEN_OFF),
    transitionKey(TenantLoanApplicationStatus.OVERDUE, TenantLoanApplicationStatus.SETTLED),
    transitionKey(TenantLoanApplicationStatus.OVERDUE, TenantLoanApplicationStatus.DEFAULTED),
    transitionKey(TenantLoanApplicationStatus.OVERDUE, TenantLoanApplicationStatus.REPAID),
    transitionKey(TenantLoanApplicationStatus.WRITTEN_OFF, TenantLoanApplicationStatus.SETTLED)
  ]),
  SYSTEM: new Set([
    transitionKey(TenantLoanApplicationStatus.SUBMITTED, TenantLoanApplicationStatus.REJECTED),
    transitionKey(TenantLoanApplicationStatus.DISBURSED, TenantLoanApplicationStatus.OVERDUE),
    transitionKey(TenantLoanApplicationStatus.OVERDUE, TenantLoanApplicationStatus.DISBURSED),
    transitionKey(TenantLoanApplicationStatus.DISBURSED, TenantLoanApplicationStatus.REPAID),
    transitionKey(TenantLoanApplicationStatus.OVERDUE, TenantLoanApplicationStatus.REPAID)
  ]),
  SUPER_ADMIN: new Set<string>(),
  TENANT_ADMIN: new Set<string>()
};

function normalizeRole(role: AdminRole): AdminRole {
  // Backward-compat for older seeded users.
  if (role === 'TENANT_ADMIN') {
    return 'CREDIT_OFFICER';
  }
  return role;
}

export function roleCanTransition(opts: {
  role: AdminRole;
  from: LoanApplicationStatus;
  to: LoanApplicationStatus;
}): boolean {
  const role = normalizeRole(opts.role);
  if (role === 'SUPER_ADMIN') {
    return true;
  }
  const allowed = ROLE_MATRIX[role];
  return allowed.has(transitionKey(opts.from, opts.to));
}

export function assertRoleCanTransition(opts: {
  role: AdminRole;
  from: LoanApplicationStatus;
  to: LoanApplicationStatus;
}): void {
  if (roleCanTransition(opts)) {
    return;
  }

  throw new ForbiddenException({
    code: 'FORBIDDEN',
    message: `Role ${opts.role} cannot transition ${opts.from} -> ${opts.to}`,
    details: {
      role: opts.role,
      from: opts.from,
      to: opts.to
    }
  });
}
