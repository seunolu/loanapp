export function getApiBaseUrl(): string {
  const value = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim();
  if (!value) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  }
  return value.replace(/\/+$/, '');
}

export function getApiV1BaseUrl(): string {
  return `${getApiBaseUrl()}/api/v1`;
}
