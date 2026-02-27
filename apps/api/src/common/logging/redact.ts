import { redact } from '../audit/audit-redactor';

export function redactForLogs(input: unknown): unknown {
  return redact(input);
}

export function redactErrorMessage(input: unknown): string {
  const raw = typeof input === 'string' ? input : input instanceof Error ? input.message : String(input ?? '');
  if (!raw) {
    return '';
  }
  return raw
    .replace(/bearer\s+[a-z0-9\-_\.]+/gi, 'Bearer [REDACTED]')
    .replace(/(refresh(token)?|access(token)?|authorization|otp|password)\s*[:=]\s*["']?[^"',\s]+/gi, '$1=[REDACTED]');
}

