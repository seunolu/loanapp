import { Prisma } from '@prisma/client';
import { TenantLedgerAccountsService } from './tenant-ledger-accounts.service';

export type CapitalPoolLedgerAccountKind = 'AVAILABLE' | 'DEPLOYED' | 'REPAID' | 'LOSSES';

export function getPoolAccountKey(poolId: string, kind: CapitalPoolLedgerAccountKind): string {
  return `pool:${poolId}:${kind}`.toLowerCase();
}

export async function createPoolAccountsIfMissing(
  tenantId: string,
  poolId: string,
  accountsService: TenantLedgerAccountsService,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await accountsService.ensureDefaultAccounts(tenantId, tx);
  void getPoolAccountKey(poolId, 'AVAILABLE');
  void getPoolAccountKey(poolId, 'DEPLOYED');
  void getPoolAccountKey(poolId, 'REPAID');
  void getPoolAccountKey(poolId, 'LOSSES');
}

