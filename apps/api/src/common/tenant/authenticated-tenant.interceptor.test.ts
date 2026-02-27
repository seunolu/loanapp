import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { of } from 'rxjs';
import { AuthenticatedTenantInterceptor } from './authenticated-tenant.interceptor';

function mockContext(user: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user })
    })
  } as any;
}

test('AuthenticatedTenantInterceptor allows anonymous requests', () => {
  const interceptor = new AuthenticatedTenantInterceptor();
  const result = interceptor.intercept(mockContext(undefined), { handle: () => of('ok') } as any);
  assert.ok(result);
});

test('AuthenticatedTenantInterceptor rejects tenant-scoped user without tenant id', () => {
  const interceptor = new AuthenticatedTenantInterceptor();
  assert.throws(
    () => interceptor.intercept(mockContext({ borrowerId: 'b_1', sessionId: 's_1' }), { handle: () => of('ok') } as any),
    /tenant context/i
  );
});

test('AuthenticatedTenantInterceptor allows tenant-scoped user with tenant id', () => {
  const interceptor = new AuthenticatedTenantInterceptor();
  const result = interceptor.intercept(
    mockContext({ borrowerId: 'b_1', sessionId: 's_1', tenantId: 'tenant_a' }),
    { handle: () => of('ok') } as any
  );
  assert.ok(result);
});

