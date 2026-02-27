import * as assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule, ApiTags } from '@nestjs/swagger';
import { test } from 'node:test';

@ApiTags('OpenApiSmoke')
@Controller('openapi-smoke')
class OpenApiSmokeController {
  @Get()
  ping() {
    return { ok: true };
  }
}

@Module({
  controllers: [OpenApiSmokeController]
})
class OpenApiSmokeModule {}

function walkControllers(dir: string, out: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkControllers(full, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('controller.ts')) {
      out.push(full);
    }
  }
}

test('swagger document generation smoke test does not throw', async () => {
  const app = await NestFactory.create(OpenApiSmokeModule, { logger: false });
  try {
    const config = new DocumentBuilder().setTitle('Smoke').setVersion('1').build();
    const doc = SwaggerModule.createDocument(app, config);
    assert.ok(doc.paths['/openapi-smoke']);
  } finally {
    await app.close();
  }
});

test('all controller files include @ApiTags for OpenAPI grouping', () => {
  const root = join(process.cwd(), 'src');
  const controllerFiles: string[] = [];
  walkControllers(root, controllerFiles);

  const missing = controllerFiles.filter((file) => !readFileSync(file, 'utf8').includes('@ApiTags('));
  assert.deepEqual(missing, []);
});

