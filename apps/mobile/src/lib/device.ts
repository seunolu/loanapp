import { v4 as uuidv4 } from 'uuid';

import { getDeviceId, setDeviceId } from './storage';

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getDeviceId();
  if (existing) {
    return existing;
  }
  const created = `mobile-${uuidv4()}`;
  await setDeviceId(created);
  return created;
}
