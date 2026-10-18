// LOCAL mode only: password hashes for test accounts in the local auth.users stand-in (scrypt, salted).
// Supabase Auth hashes real passwords in production; this file is never used there.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashLocalPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyLocalPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored?.startsWith('scrypt$')) return false;
  const [, saltHex, hashHex] = stored.split('$');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}
