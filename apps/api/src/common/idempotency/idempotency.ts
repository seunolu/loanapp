import { createHash } from 'node:crypto';

export function buildIdempotencyKey(parts: Record<string, string | number | undefined>): string {
  const normalized = Object.keys(parts)
    .sort()
    .map((key) => `${key}=${String(parts[key] ?? '')}`)
    .join('|');
  const digest = createHash('sha256').update(normalized).digest('hex');
  return `idem_${digest}`;
}
