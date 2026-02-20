import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListAdminAuditsQueryDto } from './list-admin-audits-query.dto';

test('query dto rejects invalid actorType', () => {
  const dto = plainToInstance(ListAdminAuditsQueryDto, {
    actorType: 'HACKER'
  });
  const errors = validateSync(dto);
  assert.ok(errors.length > 0);
});

test('query dto rejects oversized pageSize', () => {
  const dto = plainToInstance(ListAdminAuditsQueryDto, {
    pageSize: 1000
  });
  const errors = validateSync(dto);
  assert.ok(errors.length > 0);
});
