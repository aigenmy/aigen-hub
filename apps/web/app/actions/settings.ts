'use server';
import { hubErrorCode, schema } from '@hub/db';
import { isLocale } from '@hub/i18n';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth, type Enrollment } from '@/lib/auth';
import { TIMEZONES } from '@/lib/constants';
import { asUser } from '@/lib/db';
import { getContext } from '@/lib/session';
import type { FormState } from './types';

async function signedIn() {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await signedIn();
  const fullName = String(fd.get('fullName') ?? '').trim().slice(0, 120);
  const locale = String(fd.get('locale') ?? 'en');
  const timezone = String(fd.get('timezone') ?? 'Asia/Kuala_Lumpur');
  if (!fullName) return { error: 'name_required' };
  try {
    await asUser(ctx.claims, (tx) =>
      tx
        .update(schema.profiles)
        .set({
          fullName,
          locale: isLocale(locale) ? locale : 'en',
          timezone: (TIMEZONES as readonly string[]).includes(timezone) ? timezone : 'Asia/Kuala_Lumpur',
        })
        .where(eq(schema.profiles.id, ctx.userId)),
    );
  } catch (e) {
    return { error: hubErrorCode(e) ?? 'generic' };
  }
  if (isLocale(locale)) (await cookies()).set('hub_locale', locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'saved' };
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  await signedIn();
  const password = String(fd.get('password') ?? '');
  if (password.length < 8) return { error: 'password_short' };
  const r = await auth().updatePassword(password);
  return r.ok ? { ok: true, message: 'password_changed' } : { error: r.code };
}

export async function mfaEnrollAction(): Promise<Enrollment | { code: string }> {
  await signedIn();
  return auth().mfa.enroll('Authenticator app');
}

export async function mfaVerifyEnrollAction(factorId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  await signedIn();
  const r = await auth().mfa.verify(factorId, code.replace(/\s/g, ''));
  revalidatePath('/settings/security');
  return r.ok ? { ok: true } : { ok: false, error: r.code };
}

export async function mfaUnenrollAction(factorId: string): Promise<{ ok: boolean; error?: string }> {
  await signedIn();
  const r = await auth().mfa.unenroll(factorId);
  revalidatePath('/settings/security');
  return r.ok ? { ok: true } : { ok: false, error: r.code };
}
