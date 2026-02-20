import type { Prisma } from '@prisma/client';

type WhereInput = Prisma.TenantLoanApplicationWhereInput;

// TENANT_SCOPED_QUERY
export function prismaTenantScope(where: Omit<WhereInput, 'tenantId'> | undefined, tenantId: string): WhereInput {
  if (!where) {
    return { tenantId };
  }
  return {
    AND: [where, { tenantId }]
  };
}

