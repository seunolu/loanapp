const TOKEN_PATTERNS = [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, /\b(access|refresh)_?token\b[^,\s}]*/gi];

export function redactSecrets(value: string): string {
  return TOKEN_PATTERNS.reduce((output, pattern) => output.replace(pattern, '[REDACTED]'), value);
}

export function safeErrorMessage(error: unknown, fallback = 'Request failed.'): string {
  if (error instanceof Error && error.message.trim()) {
    return redactSecrets(error.message);
  }
  if (typeof error === 'string' && error.trim()) {
    return redactSecrets(error);
  }
  return fallback;
}

