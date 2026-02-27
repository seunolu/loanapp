import { getOrCreateDeviceId } from '../lib/device';
import { getApiBaseUrl } from '../lib/apiBaseUrl';
import { getTokens, setTokens, type SessionTokens } from './token-storage';

const API_V1 = `${getApiBaseUrl()}/api/v1`;

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function parseRefreshPayload(value: unknown): SessionTokens | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as { accessToken?: unknown; refreshToken?: unknown };
  if (typeof payload.accessToken !== 'string' || typeof payload.refreshToken !== 'string') {
    return null;
  }
  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken
  };
}

export async function hydrateStoredSession(): Promise<SessionTokens | null> {
  return getTokens();
}

export async function validateSession(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens?.accessToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_V1}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function refreshSessionTokens(): Promise<SessionTokens | null> {
  const tokens = await getTokens();
  if (!tokens?.refreshToken) {
    return null;
  }

  const response = await fetch(`${API_V1}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId(),
      'X-Device-Id': await getOrCreateDeviceId()
    },
    body: JSON.stringify({ refreshToken: tokens.refreshToken })
  });

  if (!response.ok) {
    return null;
  }

  const raw = await response.text();
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  const nextTokens = parseRefreshPayload(parsed);
  if (!nextTokens) {
    return null;
  }

  await setTokens(nextTokens);
  return nextTokens;
}
