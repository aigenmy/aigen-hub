import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, totpAt, verifyTotp } from '../lib/auth/totp';
import { safeNext } from '../lib/safe-next';

describe('safeNext (no open redirects)', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/team?tab=activity')).toBe('/team?tab=activity');
    expect(safeNext('/invite/abc')).toBe('/invite/abc');
  });
  it('refuses other sites and tricks', () => {
    for (const bad of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/ok\r\nSet-Cookie: x=1', 42, null]) {
      expect(safeNext(bad)).toBe('/home');
    }
  });
});

describe('TOTP (local 2-step sign-in)', () => {
  it('matches the RFC 6238 test vector (SHA-1, 59 s → 94287082, last 6 digits)', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(totpAt(secret, 59_000)).toBe('287082');
    expect(totpAt(secret, 1111111109_000)).toBe('081804');
  });
  it('base32 round-trips', () => {
    const b = Buffer.from([0, 1, 2, 250, 255, 7, 8]);
    expect(base32Decode(base32Encode(b)).equals(b)).toBe(true);
  });
  it('accepts the current and neighbouring codes, refuses others', () => {
    const secret = base32Encode(Buffer.from('abcdefghijabcdefghij'));
    const now = 1_800_000_000_000;
    expect(verifyTotp(secret, totpAt(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, '12345', now)).toBe(false);
  });
});
