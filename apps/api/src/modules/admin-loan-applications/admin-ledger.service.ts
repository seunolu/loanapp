import { BadRequestException, Injectable } from '@nestjs/common';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantLedgerService } from '../../common/ledger/tenant-ledger.service';
import { AuditService } from '../../common/audit/audit.service';

@Injectable()
export class AdminLedgerService {
  constructor(
    private readonly ledgerService: TenantLedgerService,
    private readonly auditService: AuditService
  ) {}

  private assertLedgerReadRole(role: TenantAdminPrincipal['role']): void {
    if (
      !['CREDIT_OFFICER', 'OPS', 'COLLECTIONS', 'RISK_MANAGER', 'SUPER_ADMIN', 'SYSTEM'].includes(
        role
      )
    ) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Role ${role} cannot access ledger reports.`,
        details: null
      });
    }
  }

  async listAccounts(principal: TenantAdminPrincipal, asOf?: string) {
    this.assertLedgerReadRole(principal.role);
    return this.ledgerService.listAccountsWithBalances(
      principal.tenantId,
      asOf ? new Date(asOf) : undefined
    );
  }

  async getAccountBalance(principal: TenantAdminPrincipal, code: string, asOf?: string) {
    this.assertLedgerReadRole(principal.role);
    const rows = await this.ledgerService.listAccountsWithBalances(
      principal.tenantId,
      asOf ? new Date(asOf) : undefined
    );
    const row = rows.find((item) => item.code === code);
    if (!row) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Account not found.',
        details: { code }
      });
    }
    return row;
  }

  async getTrialBalance(principal: TenantAdminPrincipal, asOf?: string) {
    this.assertLedgerReadRole(principal.role);
    const rows = await this.ledgerService.listAccountsWithBalances(
      principal.tenantId,
      asOf ? new Date(asOf) : undefined
    );
    return {
      asOf: asOf ?? null,
      items: rows
    };
  }

  async listEntries(
    principal: TenantAdminPrincipal,
    input: { from?: string; to?: string; referenceType?: string; referenceId?: string; limit?: number; offset?: number }
  ) {
    this.assertLedgerReadRole(principal.role);
    return this.ledgerService.listEntries({
      tenantId: principal.tenantId,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      limit: input.limit,
      offset: input.offset
    });
  }

  async reverseEntry(
    principal: TenantAdminPrincipal,
    input: { entryId: string; reason: string }
  ) {
    const result = await this.ledgerService.reverseEntry({
      tenantId: principal.tenantId,
      entryId: input.entryId,
      reason: input.reason,
      createdBy: principal.adminId,
      actorRole: principal.role
    });
    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'LEDGER_ENTRY_REVERSED',
      entity: 'TENANT_LEDGER_ENTRY',
      entityId: input.entryId,
      metadata: { reversalEntryId: result.id, reason: input.reason }
    });
    return { entryId: result.id, reused: result.reused };
  }
}
