import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { of } from 'rxjs';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { HealthController } from '../../modules/health/health.controller';
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

test('global exception payload contains requestId for tenant assertion failures', () => {
  const interceptor = new AuthenticatedTenantInterceptor();
  let exception: unknown;
  try {
    interceptor.intercept(mockContext({ borrowerId: 'b_1', sessionId: 's_1' }), { handle: () => of('ok') } as any);
  } catch (error) {
    exception = error;
  }
  assert.ok(exception);

  let responseBody: unknown = null;
  const filter = new GlobalExceptionFilter(
    { error: () => undefined } as any,
    { incrementDbQueryError: () => undefined } as any
  );
  filter.catch(exception, {
    switchToHttp: () => ({
      getRequest: () => ({
        requestId: 'req_test',
        id: 'req_test',
        header: () => undefined,
        originalUrl: '/api/v1/test',
        url: '/api/v1/test',
        method: 'GET'
      }),
      getResponse: () => ({
        setHeader: () => undefined,
        status: () => ({
          json: (payload: unknown) => {
            responseBody = payload;
          }
        })
      })
    })
  } as any);

  assert.equal((responseBody as { requestId?: string }).requestId, 'req_test');
});

test('readiness returns 503 when redis is required and down', async () => {
  const controller = new HealthController({
    getReadiness: async () => ({
      status: 'not_ready',
      version: 'dev',
      redisRequired: true,
      checks: {
        database: 'up',
        redis: 'down'
      }
    })
  } as any);

  await assert.rejects(async () => controller.getReadiness());
});
