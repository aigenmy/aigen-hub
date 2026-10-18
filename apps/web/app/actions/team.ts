'use server';
import {
  changeMemberRole,
  createInvitation,
  hubErrorCode,
  removeMember,
  revokeInvitation,
  setMemberStatus,
  type MemberRole,
} from '@hub/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { INVITE_ROLES } from '@/lib/constants';
import { asUser } from '@/lib/db';
import { env } from '@/lib/env';
import { escapeHtml, sendMail } from '@/lib/mail';
import { canManage, requireCompany } from '@/lib/session';
import type { FormState } from './types';

type Result = { ok: true } | { ok: false; error: string };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
    revalidatePath('/team');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: hubErrorCode(e) ?? 'generic' };
  }
}

export async function inviteAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireCompany('/team');
  if (!canManage(ctx.role)) return { error: 'forbidden' };
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const role = String(fd.get('role') ?? 'agent') as Exclude<MemberRole, 'owner'>;
  const values = { email, role };
  if (!EMAIL.test(email)) return { error: 'email_invalid', values };
  if (!(INVITE_ROLES as readonly string[]).includes(role)) return { error: 'forbidden', values };
  if (fd.get('understood') !== 'on') return { error: 'legal_required', values };

  let token: string;
  try {
    ({ token } = await asUser(ctx.claims, (tx) => createInvitation(tx, ctx.company.id, email, role)));
  } catch (e) {
    return { error: hubErrorCode(e) ?? 'generic', values };
  }
  const link = new URL(`/invite/${token}`, env().APP_URL).toString();

  const t = await getTranslations('team.email');
  const company = ctx.company.name;
  const inviter = ctx.profile.fullName || ctx.profile.email;
  const emailed = await sendMail(
    email,
    t('subject', { company }),
    `${t('body', { inviter, company })}\n\n${link}\n\n${t('expiry')}`,
    `<p>${escapeHtml(t('body', { inviter, company }))}</p><p><a href="${escapeHtml(link)}">${escapeHtml(t('button'))}</a></p><p style="color:#64748b">${escapeHtml(t('expiry'))}</p>`,
  );
  revalidatePath('/team');
  return { ok: true, data: { link, email, emailed: emailed ? '1' : '' } };
}

export async function revokeInvitationAction(invitationId: string): Promise<Result> {
  const ctx = await requireCompany('/team');
  return run(() => asUser(ctx.claims, (tx) => revokeInvitation(tx, invitationId)));
}

export async function changeRoleAction(userId: string, role: MemberRole): Promise<Result> {
  const ctx = await requireCompany('/team');
  return run(() => asUser(ctx.claims, (tx) => changeMemberRole(tx, ctx.company.id, userId, role)));
}

export async function setStatusAction(userId: string, status: 'active' | 'suspended'): Promise<Result> {
  const ctx = await requireCompany('/team');
  return run(() => asUser(ctx.claims, (tx) => setMemberStatus(tx, ctx.company.id, userId, status)));
}

export async function removeMemberAction(userId: string): Promise<Result> {
  const ctx = await requireCompany('/team');
  const r = await run(() => asUser(ctx.claims, (tx) => removeMember(tx, ctx.company.id, userId)));
  if (r.ok && userId === ctx.userId) redirect('/home');
  return r;
}
