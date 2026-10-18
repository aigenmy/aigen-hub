import 'server-only';
// LOCAL mode sign-in (developer PC only; env() refuses it anywhere else). Same shapes as Supabase:
// claims { sub, email, role, aal, session_id }, users in the local auth.users stand-in, 2-step with real TOTP codes.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { hashLocalPassword, verifyLocalPassword } from '@hub/db/local-password';
import { sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';
import { getDb } from '../db';
import { newTotpSecret, otpauthUri, verifyTotp } from './totp';
import type { AuthAdapter, Factor } from './types';

const COOKIE = 'hub_local_session';
const WEEK = 7 * 24 * 3600;
type Session = { sub: string; email: string; aal: 'aal1' | 'aal2'; sid: string; iat: number; exp: number };
type Row = Record<string, unknown>;

let sessionKey: string | null = null;
async function key() {
  if (!sessionKey) {
    const rows = (await getDb().execute(sql`select value from local_dev.settings where key = 'session_key'`)) as unknown as Row[];
    sessionKey = String(rows[0]?.value ?? '');
    if (sessionKey.length < 32) throw new Error('Local session key missing: run pnpm db:local:start');
  }
  return sessionKey;
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = async (body: string) => createHmac('sha256', await key()).update(body).digest('base64url');

async function readSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [body, mac] = raw.split('.');
  if (!body || !mac) return null;
  const expected = Buffer.from(await sign(body));
  const got = Buffer.from(mac);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
  return s.exp > Date.now() / 1000 ? s : null;
}

async function writeSession(s: Omit<Session, 'iat' | 'exp'>) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64(JSON.stringify({ ...s, iat: now, exp: now + WEEK }));
  (await cookies()).set(COOKIE, `${body}.${await sign(body)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: WEEK,
  });
}

const q = async (query: ReturnType<typeof sql>) => (await getDb().execute(query)) as unknown as Row[];

/** Local test accounts (seeded by pnpm seed:demo), shown on the local sign-in page. */
export async function localTestAccounts() {
  const rows = await q(sql`select u.email, p.full_name, p.is_staff from auth.users u join public.profiles p on p.id = u.id
                           where u.email like '%@demo.aigen.test' or u.email like '%@aigen.test' order by p.is_staff desc, u.email`);
  return rows.map((r) => ({ email: r.email as string, name: r.full_name as string, isStaff: Boolean(r.is_staff) }));
}

/** One-click sign-in for a local test account (local mode only; the caller checks the mode). */
export async function localSignInAs(email: string) {
  const [u] = await q(sql`select id, email from auth.users where lower(email) = lower(${email})
                          and (email like '%@demo.aigen.test' or email like '%@aigen.test')`);
  if (!u) return false;
  await writeSession({ sub: u.id as string, email: String(u.email), aal: 'aal1', sid: randomUUID() });
  return true;
}

export const localAuth: AuthAdapter = {
  mode: 'local',

  async getClaims() {
    const s = await readSession();
    return s ? { sub: s.sub, email: s.email, role: 'authenticated', aal: s.aal, session_id: s.sid } : null;
  },

  async signInWithPassword(email, password) {
    const [u] = await q(sql`select id, email, encrypted_password from auth.users where lower(email) = lower(${email})`);
    if (!u || !verifyLocalPassword(password, u.encrypted_password as string)) return { ok: false, code: 'invalid_credentials' };
    await q(sql`update auth.users set last_sign_in_at = now() where id = ${u.id as string}`);
    await writeSession({ sub: u.id as string, email: String(u.email).toLowerCase(), aal: 'aal1', sid: randomUUID() });
    return { ok: true };
  },

  async signUp({ email, password, fullName, locale }) {
    const [exists] = await q(sql`select 1 from auth.users where lower(email) = lower(${email})`);
    if (exists) return { ok: false, code: 'user_already_exists' };
    const meta = JSON.stringify({ full_name: fullName, locale });
    const [u] = await q(sql`insert into auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
                            values (${email.toLowerCase()}, ${hashLocalPassword(password)}, now(), ${meta}::jsonb) returning id`);
    await writeSession({ sub: u!.id as string, email: email.toLowerCase(), aal: 'aal1', sid: randomUUID() });
    return { ok: true };
  },

  async signOut() {
    (await cookies()).delete(COOKIE);
  },

  async sendMagicLink() {
    return { ok: false, code: 'not_in_local_mode' };
  },

  async googleSignInUrl() {
    return null;
  },

  async requestPasswordReset() {
    return { ok: false, code: 'not_in_local_mode' };
  },

  async updatePassword(password) {
    const s = await readSession();
    if (!s) return { ok: false, code: 'not_authenticated' };
    await q(sql`update auth.users set encrypted_password = ${hashLocalPassword(password)}, updated_at = now() where id = ${s.sub}`);
    return { ok: true };
  },

  mfa: {
    async nextLevel() {
      const s = await readSession();
      if (!s) return 'aal1';
      const [f] = await q(sql`select 1 from local_dev.mfa_factors where user_id = ${s.sub} and status = 'verified' limit 1`);
      return f ? 'aal2' : 'aal1';
    },

    async list(): Promise<Factor[]> {
      const s = await readSession();
      if (!s) return [];
      const rows = await q(sql`select id, friendly_name, status, created_at from local_dev.mfa_factors where user_id = ${s.sub} order by created_at`);
      return rows.map((r) => ({
        id: r.id as string,
        name: r.friendly_name as string,
        status: r.status as Factor['status'],
        createdAt: new Date(r.created_at as string).toISOString(),
      }));
    },

    async enroll(friendlyName) {
      const s = await readSession();
      if (!s) return { code: 'not_authenticated' };
      await q(sql`delete from local_dev.mfa_factors where user_id = ${s.sub} and status = 'unverified'`);
      const secret = newTotpSecret();
      const [f] = await q(sql`insert into local_dev.mfa_factors (user_id, friendly_name, secret)
                              values (${s.sub}, ${friendlyName}, ${secret}) returning id`);
      const qrSvg = await QRCode.toString(otpauthUri(secret, s.email), { type: 'svg', margin: 1, width: 180 });
      return { factorId: f!.id as string, qrDataUrl: `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`, secret };
    },

    async verify(factorId, code) {
      const s = await readSession();
      if (!s) return { ok: false, code: 'not_authenticated' };
      const [f] = await q(sql`select secret from local_dev.mfa_factors where id = ${factorId} and user_id = ${s.sub}`);
      if (!f || !verifyTotp(f.secret as string, code)) return { ok: false, code: 'mfa_invalid_code' };
      await q(sql`update local_dev.mfa_factors set status = 'verified' where id = ${factorId}`);
      await writeSession({ sub: s.sub, email: s.email, aal: 'aal2', sid: s.sid });
      return { ok: true };
    },

    async unenroll(factorId) {
      const s = await readSession();
      if (!s) return { ok: false, code: 'not_authenticated' };
      if (s.aal !== 'aal2') return { ok: false, code: 'mfa_required' };
      await q(sql`delete from local_dev.mfa_factors where id = ${factorId} and user_id = ${s.sub}`);
      return { ok: true };
    },
  },
};
