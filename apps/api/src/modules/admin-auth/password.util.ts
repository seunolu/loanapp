import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `s2:${salt}:${digest}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 's2') {
    return false;
  }

  const [, salt, digest] = parts;
  const derived = scryptSync(password, salt, 64).toString('hex');

  const left = Buffer.from(digest, 'hex');
  const right = Buffer.from(derived, 'hex');

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
