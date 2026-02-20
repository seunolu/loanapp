import { createHash } from 'node:crypto';
import { redact } from './audit-redactor';

export function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function redactSensitive(input: unknown): unknown {
  return redact(input);
}

export function computeDiff(before: unknown, after: unknown): Record<string, { before: unknown; after: unknown }> | null {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
    return null;
  }
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(before as Record<string, unknown>), ...Object.keys(after as Record<string, unknown>)]);
  for (const key of keys) {
    const a = (before as Record<string, unknown>)[key];
    const b = (after as Record<string, unknown>)[key];
    if (canonicalStringify(a) !== canonicalStringify(b)) {
      diff[key] = { before: a, after: b };
    }
  }
  return Object.keys(diff).length ? diff : null;
}

export function computeAuditHash(payload: Record<string, unknown>): string {
  return sha256(canonicalStringify(payload));
}

