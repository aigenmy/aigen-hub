'use server';
import { createCompany, hubErrorCode, schema } from '@hub/db';
import { isLocale } from '@hub/i18n';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COMPANY_TYPES, TIMEZONES } from '@/lib/constants';
import { asUser } from '@/lib/db';
import { COMPANY_COOKIE, canManage, getContext, requireCompany, requireUser } from '@/lib/session';
import type { FormState } from './types';


const cookieOpts = { path: '/', maxAge: 31536000, sameSite: 'lax' as const, httpOnly: true };

export async function createCompanyAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireUser('/onboarding');
  const name = String(fd.get('name') ?? '').trim();
  const type = String(fd.get('type') ?? 'other');
  const locale = String(fd.get('locale') ?? 'en');
  const values = { name, type, locale };
  if (name.length < 2 || name.length > 120) return { error: 'company_name_invalid', values };
  let id: string;
  try {
    id = await asUser(ctx.claims, (tx) =>
      createCompany(tx, name, (COMPANY_TYPES as readonly string[]).includes(type) ? type : 'other', isLocale(locale) ? locale : 'en'),
    );
  } catch (e) {
    return { error: hubErrorCode(e) ?? 'generic', values };
  }
  (await cookies()).set(COMPANY_COOKIE, id, cookieOpts);
  redirect('/onboarding?step=team');
}

export async function switchCompanyAction(companyId: string) {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  if (!ctx.memberships.some((m) => m.companyId === companyId)) return;
  (await cookies()).set(COMPANY_COOKIE, companyId, cookieOpts);
  await asUser(ctx.claims, (tx) =>
    tx.update(schema.profiles).set({ activeCompanyId: companyId }).where(eq(schema.profiles.id, ctx.userId)),
  );
  redirect('/home');
}

export async function updateCompanyAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireCompany('/settings/company');
  if (!canManage(ctx.role)) return { error: 'forbidden' };
  const name = String(fd.get('name') ?? '').trim();
  const type = String(fd.get('type') ?? 'other');
  const locale = String(fd.get('locale') ?? 'en');
  const timezone = String(fd.get('timezone') ?? 'Asia/Kuala_Lumpur');
  if (name.length < 2 || name.length > 120) return { error: 'company_name_invalid' };
  try {
    await asUser(ctx.claims, (tx) =>
      tx
        .update(schema.companies)
        .set({
          name,
          type: (COMPANY_TYPES as readonly string[]).includes(type) ? type : 'other',
          locale: isLocale(locale) ? locale : 'en',
          timezone: (TIMEZONES as readonly string[]).includes(timezone) ? timezone : 'Asia/Kuala_Lumpur',
        })
        .where(eq(schema.companies.id, ctx.company.id)),
    );
  } catch (e) {
    return { error: hubErrorCode(e) ?? 'generic' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, message: 'saved' };
}

export async function finishOnboardingAction() {
  const ctx = await requireCompany('/onboarding');
  if (canManage(ctx.role)) {
    await asUser(ctx.claims, (tx) =>
      tx
        .update(schema.companies)
        .set({ onboarding: sql`${schema.companies.onboarding} || '{"done": true}'::jsonb` })
        .where(eq(schema.companies.id, ctx.company.id)),
    );
  }
  redirect('/home');
}

export async function touchLastActive() {
  const ctx = await getContext();
  if (!ctx?.company) return;
  await asUser(ctx.claims, (tx) =>
    tx
      .update(schema.companyMembers)
      .set({ lastActiveAt: new Date() })
      .where(sql`${schema.companyMembers.companyId} = ${ctx.company!.id} and ${schema.companyMembers.userId} = ${ctx.userId}
                 and (${schema.companyMembers.lastActiveAt} is null or ${schema.companyMembers.lastActiveAt} < now() - interval '5 minutes')`),
  );
}
