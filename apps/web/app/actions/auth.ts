'use server';
import { isLocale } from '@hub/i18n';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { localSignInAs } from '@/lib/auth/local';
import { isLocalMode } from '@/lib/env';
import { safeNext } from '@/lib/safe-next';
import { getClaims } from '@/lib/session';
import type { FormState } from './types';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const next = safeNext(fd.get('next'));
  if (!EMAIL.test(email) || !password) return { error: 'invalid_credentials', values: { email } };
  const r = await auth().signInWithPassword(email, password);
  if (!r.ok) return { error: r.code, values: { email } };
  redirect(next);
}

export async function signupAction(_: FormState, fd: FormData): Promise<FormState> {
  const fullName = str(fd, 'fullName').slice(0, 120);
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const locale = str(fd, 'locale');
  const values = { fullName, email, locale };
  if (!fullName) return { error: 'name_required', values };
  if (!EMAIL.test(email)) return { error: 'email_invalid', values };
  if (password.length < 8) return { error: 'password_short', values };
  const lang = isLocale(locale) ? locale : 'en';
  const next = safeNext(fd.get('next'), '/onboarding');
  const r = await auth().signUp({ email, password, fullName, locale: lang, next });
  if (!r.ok) return { error: r.code, values };
  (await cookies()).set('hub_locale', lang, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  if (r.needsConfirmation) redirect('/check-email');
  redirect(next);
}

export async function magicLinkAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'email_invalid', values: { email } };
  const r = await auth().sendMagicLink(email, safeNext(fd.get('next')));
  return r.ok ? { ok: true, message: 'magic_link_sent', values: { email } } : { error: r.code, values: { email } };
}

export async function googleAction(fd: FormData) {
  const url = await auth().googleSignInUrl(safeNext(fd.get('next')));
  redirect(url ?? '/login?error=auth_error');
}

export async function forgotAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'email_invalid', values: { email } };
  const r = await auth().requestPasswordReset(email);
  return r.ok ? { ok: true, values: { email } } : { error: r.code, values: { email } };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get('password') ?? '');
  if (password.length < 8) return { error: 'password_short' };
  if (!(await getClaims())) return { error: 'not_authenticated' };
  const r = await auth().updatePassword(password);
  return r.ok ? { ok: true } : { error: r.code };
}

export async function mfaChallengeAction(_: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, 'code').replace(/\s/g, '');
  const next = safeNext(fd.get('next'));
  const factor = (await auth().mfa.list()).find((f) => f.status === 'verified');
  if (!factor) redirect(next);
  const r = await auth().mfa.verify(factor.id, code);
  if (!r.ok) return { error: r.code };
  redirect(next);
}

export async function signOutAction() {
  await auth().signOut();
  redirect('/login');
}

export async function localSignInAsAction(fd: FormData) {
  if (!isLocalMode()) redirect('/login');
  const ok = await localSignInAs(str(fd, 'email'));
  redirect(ok ? safeNext(fd.get('next')) : '/login');
}

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set('hub_locale', locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  const claims = await getClaims();
  if (claims) {
    const { asUser } = await import('@/lib/db');
    const { schema } = await import('@hub/db');
    const { eq } = await import('drizzle-orm');
    await asUser(claims, (tx) => tx.update(schema.profiles).set({ locale }).where(eq(schema.profiles.id, claims.sub)));
  }
}
