import { Injectable } from '@nestjs/common';

export type RetentionPolicy = {
  entity: string;
  retentionYears: number;
  archiveEnabled: boolean;
};

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { entity: 'AuditEvent', retentionYears: 7, archiveEnabled: true },
  { entity: 'AuditLog', retentionYears: 7, archiveEnabled: true },
  { entity: 'TenantLedgerEntry', retentionYears: 10, archiveEnabled: true },
  { entity: 'LoanRepayment', retentionYears: 10, archiveEnabled: true },
  { entity: 'TenantDisbursement', retentionYears: 10, archiveEnabled: true },
  { entity: 'SuspiciousActivity', retentionYears: 7, archiveEnabled: true }
];

@Injectable()
export class RetentionPolicyService {
  private readonly policies = new Map(DEFAULT_POLICIES.map((policy) => [policy.entity, policy]));

  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  getPolicy(entity: string): RetentionPolicy | null {
    return this.policies.get(entity) ?? null;
  }

  buildArchivePlan(asOf = new Date()): Array<{ entity: string; archiveBefore: string; archiveEnabled: boolean }> {
    return this.getPolicies().map((policy) => {
      const archiveBefore = new Date(asOf);
      archiveBefore.setUTCFullYear(archiveBefore.getUTCFullYear() - policy.retentionYears);
      return {
        entity: policy.entity,
        archiveBefore: archiveBefore.toISOString(),
        archiveEnabled: policy.archiveEnabled
      };
    });
  }
}

