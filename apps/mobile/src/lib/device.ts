import { getDeviceId, setDeviceId } from './storage';

function generateDeviceId(): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;

  return `mobile-${randomPart}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getDeviceId();
  if (existing) {
    return existing;
  }
  const created = generateDeviceId();
  await setDeviceId(created);
  return created;
}
