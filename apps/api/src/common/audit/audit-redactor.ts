const SECRET_KEYS = [
  'password',
  'pin',
  'token',
  'accessToken',
  'refreshToken',
  'otp',
  'verificationCode'
];

function maskEmail(value: string): string {
  const [name, domain] = value.split('@');
  if (!name || !domain) return '[REDACTED]';
  if (name.length <= 2) return `**@${domain}`;
  return `${name.slice(0, 1)}***${name.slice(-1)}@${domain}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return '[REDACTED]';
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

function maskLast4(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `****${digits.slice(-4)}`;
}

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    SECRET_KEYS.some((token) => lower.includes(token.toLowerCase())) ||
    lower.includes('secret') ||
    lower.includes('password')
  );
}

function redactStringByKey(key: string, value: string): string {
  const lower = key.toLowerCase();
  if (isSecretKey(key)) return '[REDACTED]';
  if (lower.includes('email')) return maskEmail(value);
  if (lower.includes('phone')) return maskPhone(value);
  if (lower.includes('bvn') || lower.includes('nin') || lower.includes('accountnumber') || lower.includes('cardpan')) {
    return maskLast4(value);
  }
  return value;
}

export function redact(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => redact(item));
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (isSecretKey(key)) {
        out[key] = '[REDACTED]';
        continue;
      }

      const lower = key.toLowerCase();
      if (lower.includes('address') && value && typeof value === 'object') {
        const address = value as Record<string, unknown>;
        out[key] = {
          city: address.city ?? null,
          state: address.state ?? null
        };
        continue;
      }

      if (typeof value === 'string') {
        out[key] = redactStringByKey(key, value);
        continue;
      }
      out[key] = redact(value);
    }
    return out;
  }
  return input;
}

