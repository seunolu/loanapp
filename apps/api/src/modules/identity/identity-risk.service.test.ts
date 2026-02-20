import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { IdentityRiskService } from './identity-risk.service';

function buildService(prisma: any): IdentityRiskService {
  return new IdentityRiskService(prisma);
}

test('identity risk flags name and dob mismatch', async () => {
  const service = buildService({
    identityVerification: {
      count: async () => 0,
      findFirst: async () => null
    }
  });

  const result = await service.evaluate({
    lenderId: 'tenant_1',
    userId: 'user_1',
    bvnHash: 'hash_1',
    nameSimilarity: 0.5,
    borrowerDob: new Date('1999-01-01'),
    verifiedDob: new Date('1998-01-01')
  });

  assert.ok(result.flags.includes('NAME_MISMATCH'));
  assert.ok(result.flags.includes('DOB_MISMATCH'));
  assert.ok(result.riskScore >= 75);
});

test('identity risk flags bvn reuse across users', async () => {
  const service = buildService({
    identityVerification: {
      count: async () => 0,
      findFirst: async () => ({ id: 'existing' })
    }
  });

  const result = await service.evaluate({
    lenderId: 'tenant_1',
    userId: 'user_2',
    bvnHash: 'hash_1',
    nameSimilarity: 0.9,
    borrowerDob: null,
    verifiedDob: null
  });

  assert.ok(result.flags.includes('BVN_REUSED_ACROSS_USERS'));
  assert.ok(result.riskScore >= 70);
});

