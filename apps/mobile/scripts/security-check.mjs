import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packageJsonPath = join(root, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

function assertDependency(name) {
  const deps = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };
  if (!deps[name]) {
    throw new Error(`Missing dependency: ${name}`);
  }
}

function assertNoTokenLogging() {
  const roots = [join(root, 'src'), join(root, 'app')];
  const suspicious = [];

  const patterns = [
    /console\.(log|error|warn).*(Authorization)/i,
    /console\.(log|error|warn).*(accessToken|refreshToken)/i
  ];

  function walk(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(entry)) {
        continue;
      }
      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (patterns.some((pattern) => pattern.test(line))) {
          suspicious.push(`${fullPath}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }

  for (const dir of roots) {
    try {
      walk(dir);
    } catch (error) {
      throw new Error(`Failed to scan ${dir}: ${String(error)}`);
    }
  }

  if (suspicious.length > 0) {
    throw new Error(`Potential sensitive logging found:\n${suspicious.join('\n')}`);
  }
}

assertDependency('expo-secure-store');
assertDependency('expo-local-authentication');
assertDependency('expo-screen-capture');
assertNoTokenLogging();

console.log('security-check: OK');
