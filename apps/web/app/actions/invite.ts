'use server';
import { acceptInvitation, hubErrorCode } from '@hub/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { asUser } from '@/lib/db';
import { COMPANY_COOKIE, requireUser } from '@/lib/session';
import type { FormState } from './types';

export async function acceptInvitationAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get('token') ?? '');
  const ctx = await requireUser(`/invite/${encodeURIComponent(token)}`);
  let companyId: string;
  try {
    companyId = await asUser(ctx.claims, (tx) => acceptInvitation(tx, token));
  } catch (e) {
    return { error: hubErrorCode(e) ?? 'generic' };
  }
  (await cookies()).set(COMPANY_COOKIE, companyId, { path: '/', maxAge: 31536000, sameSite: 'lax', httpOnly: true });
  redirect('/home');
}
