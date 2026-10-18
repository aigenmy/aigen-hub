import 'server-only';
// Production sign-in: Supabase Auth (Google, email + password, email link, TOTP 2-step), cookies via @supabase/ssr.
import type { Claims } from '@hub/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '../env';
import type { AuthAdapter, AuthResult } from './types';

export async function supabaseServer() {
  const store = await cookies();
  const e = env();
  return createServerClient(e.NEXT_PUBLIC_SUPABASE_URL!, e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there; proxy.ts refreshes the session.
        }
      },
    },
  });
}

const KNOWN = new Set([
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'email_exists',
  'weak_password',
  'same_password',
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'mfa_verification_failed',
  'email_address_invalid',
  'signup_disabled',
]);

function fail(error: { code?: string } | null | undefined): AuthResult {
  if (!error) return { ok: true };
  if (error.code === 'mfa_verification_failed') return { ok: false, code: 'mfa_invalid_code' };
  const code = error.code === 'email_exists' ? 'user_already_exists' : error.code;
  return { ok: false, code: code && KNOWN.has(code) ? code : 'auth_error' };
}

const appUrl = (path: string) => new URL(path, env().APP_URL).toString();

export const supabaseAuth: AuthAdapter = {
  mode: 'supabase',

  async getClaims() {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.getClaims();
    if (error || !data?.claims?.sub) return null;
    return data.claims as unknown as Claims;
  },

  async signInWithPassword(email, password) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return fail(error);
  },

  async signUp({ email, password, fullName, locale, next }) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, locale }, emailRedirectTo: appUrl(`/auth/callback?next=${encodeURIComponent(next ?? '/onboarding')}`) },
    });
    if (error) return fail(error);
    return { ok: true, needsConfirmation: !data.session };
  },

  async signOut() {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  },

  async sendMagicLink(email, next) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: appUrl(`/auth/callback?next=${encodeURIComponent(next)}`) },
    });
    // Same answer whether or not the account exists (no account probing).
    if (error && error.code !== 'otp_disabled' && error.code !== 'signup_disabled') return fail(error);
    return { ok: true };
  },

  async googleSignInUrl(next) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl(`/auth/callback?next=${encodeURIComponent(next)}`), skipBrowserRedirect: true },
    });
    return error ? null : data.url;
  },

  async requestPasswordReset(email) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl('/auth/callback?next=/reset') });
    if (error && error.code !== 'user_not_found') return fail(error);
    return { ok: true };
  },

  async updatePassword(password) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.updateUser({ password });
    return fail(error);
  },

  mfa: {
    async nextLevel() {
      // Ask the Auth server (getUser), not the session cookie: the cookie's user object is not signed, so a
      // stolen password-only session could hide its factors and skip the 2-step challenge.
      const sb = await supabaseServer();
      const { data, error } = await sb.auth.getUser();
      if (error || !data.user) return 'aal2'; // fail closed: ask for the code
      return data.user.factors?.some((f) => f.status === 'verified') ? 'aal2' : 'aal1';
    },

    async list() {
      const sb = await supabaseServer();
      const { data } = await sb.auth.mfa.listFactors();
      return (data?.all ?? [])
        .filter((f) => f.factor_type === 'totp')
        .map((f) => ({
          id: f.id,
          name: f.friendly_name ?? '',
          status: f.status === 'verified' ? ('verified' as const) : ('unverified' as const),
          createdAt: f.created_at,
        }));
    },

    async enroll(friendlyName) {
      const sb = await supabaseServer();
      // Drop half-finished enrolments first (Supabase refuses a second unverified factor with the same name).
      const { data: list } = await sb.auth.mfa.listFactors();
      for (const f of list?.all ?? []) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName });
      if (error || !data) {
        const r = fail(error ?? { code: 'auth_error' });
        return { code: r.ok ? 'auth_error' : r.code };
      }
      const qr = data.totp.qr_code;
      const qrDataUrl = qr.startsWith('data:') ? qr : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
      return { factorId: data.id, qrDataUrl, secret: data.totp.secret };
    },

    async verify(factorId, code) {
      const sb = await supabaseServer();
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
      return fail(error);
    },

    async unenroll(factorId) {
      const sb = await supabaseServer();
      const { error } = await sb.auth.mfa.unenroll({ factorId });
      return fail(error);
    },
  },
};
