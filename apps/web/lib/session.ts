import 'server-only';
// Who is signed in, which company they are working in, their role and the modules that company has.
// Everything is read through asUser(), so RLS decides what exists for this person.
import { loadEntitlements, schema, type Claims, type Company, type MemberRole } from '@hub/db';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from './auth';
import { asUser } from './db';
import { pendingLegalDocuments } from './legal';

export const COMPANY_COOKIE = 'hub_company';

export type Membership = { companyId: string; name: string; role: MemberRole; planId: string };

export type AppContext = {
  claims: Claims;
  userId: string;
  aal: 'aal1' | 'aal2';
  profile: {
    email: string;
    fullName: string;
    avatarUrl: string | null;
    locale: string;
    timezone: string;
    isStaff: boolean;
    createdAt: Date;
  };
  memberships: Membership[];
  company: Company | null;
  role: MemberRole | null;
  joinedAt: Date | null;
  entitlements: string[];
};

export const getClaims = cache(async (): Promise<Claims | null> => auth().getClaims());

export const getContext = cache(async (): Promise<AppContext | null> => {
  const claims = await getClaims();
  if (!claims) return null;
  const preferred = (await cookies()).get(COMPANY_COOKIE)?.value;
  return asUser(claims, async (tx) => {
    let [p] = await tx.select().from(schema.profiles).where(eq(schema.profiles.id, claims.sub));
    if (!p) {
      // The auth.users trigger normally creates it; this covers a project where that trigger is missing.
      await tx.execute(sql`select public.ensure_profile()`);
      [p] = await tx.select().from(schema.profiles).where(eq(schema.profiles.id, claims.sub));
    }
    const memberships = await tx
      .select({
        companyId: schema.companyMembers.companyId,
        name: schema.companies.name,
        role: schema.companyMembers.role,
        planId: schema.companies.planId,
        joinedAt: schema.companyMembers.joinedAt,
      })
      .from(schema.companyMembers)
      .innerJoin(schema.companies, eq(schema.companies.id, schema.companyMembers.companyId))
      .where(
        and(
          eq(schema.companyMembers.userId, claims.sub),
          eq(schema.companyMembers.status, 'active'),
          isNull(schema.companies.deletedAt),
        ),
      )
      .orderBy(asc(schema.companies.name));

    const active =
      memberships.find((m) => m.companyId === preferred) ??
      memberships.find((m) => m.companyId === p?.activeCompanyId) ??
      memberships[0] ??
      null;

    let company: Company | null = null;
    let entitlements: string[] = [];
    if (active) {
      [company = null] = await tx.select().from(schema.companies).where(eq(schema.companies.id, active.companyId));
      entitlements = [...(await loadEntitlements(tx, active.companyId)).keys()];
    }

    return {
      claims,
      userId: claims.sub,
      aal: claims.aal === 'aal2' ? 'aal2' : 'aal1',
      profile: {
        email: p?.email ?? String(claims.email ?? ''),
        fullName: p?.fullName ?? '',
        avatarUrl: p?.avatarUrl ?? null,
        locale: p?.locale ?? 'en',
        timezone: p?.timezone ?? 'Asia/Kuala_Lumpur',
        isStaff: p?.isStaff ?? false,
        createdAt: p?.createdAt ?? new Date(),
      },
      memberships: memberships.map((m) => ({ companyId: m.companyId, name: m.name, role: m.role, planId: m.planId })),
      company,
      role: active?.role ?? null,
      joinedAt: active?.joinedAt ?? null,
      entitlements,
    };
  });
});

const loginUrl = (next: string) => `/login?next=${encodeURIComponent(next)}`;

/** Signed in, past the 2-step check and the legal gate. May have no company yet. */
export async function requireUser(next: string): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) redirect(loginUrl(next));
  if (ctx.aal === 'aal1' && (await needsSecondFactor())) redirect(`/mfa?next=${encodeURIComponent(next)}`);
  const pending = await asUser(ctx.claims, (tx) => pendingLegalDocuments(tx, ctx.userId));
  if (pending.length) redirect(`/accept?next=${encodeURIComponent(next)}`);
  return ctx;
}

/** Signed in and working inside a company. */
export async function requireCompany(next: string): Promise<AppContext & { company: Company; role: MemberRole }> {
  const ctx = await requireUser(next);
  if (!ctx.company || !ctx.role) redirect('/onboarding');
  return ctx as AppContext & { company: Company; role: MemberRole };
}

/** AIGen staff with a second factor in this session (the database checks the same thing). */
export async function requireStaff(next = '/console'): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) redirect(loginUrl(next));
  if (!ctx.profile.isStaff) notFound();
  if (ctx.aal !== 'aal2') {
    if (await needsSecondFactor()) redirect(`/mfa?next=${encodeURIComponent(next)}`);
    redirect('/settings/security?staff=1');
  }
  return ctx;
}

export const needsSecondFactor = cache(async () => (await auth().mfa.nextLevel()) === 'aal2');

export const canManage = (role: MemberRole | null) => role === 'owner' || role === 'admin';
