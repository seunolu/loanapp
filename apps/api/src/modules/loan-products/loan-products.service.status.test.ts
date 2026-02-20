import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { LoanProductsService } from './loan-products.service';

test('update blocks immutable ACTIVE fields', async () => {
  const service = new LoanProductsService({
    loanProduct: {
      findFirst: async () => ({
        id: 'prod_1',
        tenantId: 'tenant_1',
        status: ProductStatus.ACTIVE,
        minPrincipal: 100,
        maxPrincipal: 200,
        minTenorDays: 10,
        maxTenorDays: 30,
        interestRateBps: 1000
      })
    }
  } as any);

  await assert.rejects(
    () =>
      service.update(
        {
          adminId: 'admin_1',
          tenantId: 'tenant_1',
          email: 'admin@example.com',
          role: 'OPS'
        },
        'prod_1',
        { maxPrincipal: 999 } as any
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});
