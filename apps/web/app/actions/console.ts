'use server';
// AIGen staff actions. Each runs as the staff user (RLS staff policies need profile flag + aal2) and is audited by triggers.
import { hubErrorCode, schema } from '@hub/db';
import { bundledDoc, OPERATOR_MISSING } from '@hub/legal';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { asUser } from '@/lib/db';
import { isLocalMode } from '@/lib/env';
import { requireStaff } from '@/lib/session';
import type { FormState } from './types';

type Result = { ok: true } | { ok: false; error: string };

async function staffRun(path: string, fn: (ctx: Awaited<ReturnType<typeof requireStaff>>) => Promise<unknown>): Promise<Result> {
  const ctx = await requireStaff(path);
  try {
    await fn(ctx);
    revalidatePath(path);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: hubErrorCode(e) ?? 'generic' };
  }
}

const int = (v: FormDataEntryValue | null, min = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min ? n : null;
};
const sen = (v: FormDataEntryValue | null) => {
  if (v === null || String(v).trim() === '') return null;
  const n = Math.round(Number(v) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export async function updateCompanyPlanAction(companyId: string, _: FormState, fd: FormData): Promise<FormState> {
  const seats = int(fd.get('seatsLimit'), 1);
  if (seats === null) return { error: 'generic' };
  const status = String(fd.get('planStatus')) as (typeof schema.planStatus.enumValues)[number];
  if (!schema.planStatus.enumValues.includes(status)) return { error: 'generic' };
  const r = await staffRun(`/console/companies/${companyId}`, (ctx) =>
    asUser(ctx.claims, (tx) =>
      tx
        .update(schema.companies)
        .set({
          planId: String(fd.get('planId')),
          planStatus: status,
          seatsLimit: seats,
          isFounder: fd.get('isFounder') === 'on',
          isInternal: fd.get('isInternal') === 'on',
        })
        .where(eq(schema.companies.id, companyId)),
    ),
  );
  return r.ok ? { ok: true, message: 'saved' } : { error: r.error };
}

export async function setCompanyModuleAction(companyId: string, moduleId: string, state: 'on' | 'off' | 'default'): Promise<Result> {
  return staffRun(`/console/companies/${companyId}`, (ctx) =>
    asUser(ctx.claims, async (tx) => {
      const where = and(eq(schema.companyModules.companyId, companyId), eq(schema.companyModules.moduleId, moduleId));
      if (state === 'default') {
        await tx.delete(schema.companyModules).where(where);
      } else {
        await tx
          .insert(schema.companyModules)
          .values({ companyId, moduleId, state, updatedBy: ctx.userId })
          .onConflictDoUpdate({
            target: [schema.companyModules.companyId, schema.companyModules.moduleId],
            set: { state, updatedBy: ctx.userId },
          });
      }
    }),
  );
}

export async function addCompanyNoteAction(companyId: string, _: FormState, fd: FormData): Promise<FormState> {
  const body = String(fd.get('body') ?? '').trim().slice(0, 4000);
  if (!body) return { error: 'generic' };
  const r = await staffRun(`/console/companies/${companyId}`, (ctx) =>
    asUser(ctx.claims, (tx) => tx.insert(schema.companyNotes).values({ companyId, body, authorId: ctx.userId })),
  );
  return r.ok ? { ok: true } : { error: r.error };
}

export async function updatePlanAction(planId: string, _: FormState, fd: FormData): Promise<FormState> {
  const seatsIncluded = int(fd.get('seatsIncluded'), 1);
  const priceMonthlySen = sen(fd.get('priceMonthly'));
  const priceYearlySen = sen(fd.get('priceYearly'));
  if (seatsIncluded === null || priceMonthlySen === null || priceYearlySen === null) return { error: 'generic' };
  const r = await staffRun('/console/plans', (ctx) =>
    asUser(ctx.claims, (tx) =>
      tx
        .update(schema.plans)
        .set({
          priceMonthlySen,
          priceYearlySen,
          seatsIncluded,
          extraSeatSen: sen(fd.get('extraSeat')),
          aiAssistsMonth: int(fd.get('aiAssists')) ?? 0,
          autoMode: fd.get('autoMode') === 'on',
          contactsSoftCap: int(fd.get('contacts')),
          knowledgeDocs: int(fd.get('knowledge')) ?? 0,
          whatsappNumbers: int(fd.get('whatsapp')) ?? 0,
          mailboxes: int(fd.get('mailboxes')) ?? 0,
          auditRetentionDays: int(fd.get('retention'), 30) ?? 90,
        })
        .where(eq(schema.plans.id, planId)),
    ),
  );
  return r.ok ? { ok: true, message: 'saved' } : { error: r.error };
}

export async function togglePlanModuleAction(planId: string, moduleId: string, on: boolean): Promise<Result> {
  return staffRun('/console/plans', (ctx) =>
    asUser(ctx.claims, async (tx) => {
      if (on) await tx.insert(schema.planModules).values({ planId, moduleId }).onConflictDoNothing();
      else
        await tx
          .delete(schema.planModules)
          .where(and(eq(schema.planModules.planId, planId), eq(schema.planModules.moduleId, moduleId)));
    }),
  );
}

export async function setFlagAction(key: string, enabled: boolean, rolloutPercent: number): Promise<Result> {
  const pct = Math.max(0, Math.min(100, Math.round(rolloutPercent)));
  return staffRun('/console/flags', (ctx) =>
    asUser(ctx.claims, (tx) =>
      tx.update(schema.featureFlags).set({ enabled, rolloutPercent: pct }).where(eq(schema.featureFlags.key, key)),
    ),
  );
}

export async function setPlatformSettingAction(key: 'billing_enabled' | 'signups_open' | 'beta', value: boolean): Promise<Result> {
  return staffRun('/console/flags', (ctx) =>
    asUser(ctx.claims, (tx) =>
      tx.update(schema.platformSettings).set({ value }).where(eq(schema.platformSettings.key, key)),
    ),
  );
}

/** Publishes the bundled version of a legal document. Refused while operator details are missing (except locally). */
export async function publishLegalAction(kind: string): Promise<Result> {
  const doc = bundledDoc(kind);
  if (!doc) return { ok: false, error: 'not_found' };
  if (OPERATOR_MISSING.length && !isLocalMode()) return { ok: false, error: 'operator_missing' };
  return staffRun('/console/legal', (ctx) =>
    asUser(ctx.claims, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.legalDocuments)
        .where(
          and(
            eq(schema.legalDocuments.kind, doc.kind),
            eq(schema.legalDocuments.locale, doc.locale),
            eq(schema.legalDocuments.version, doc.version),
          ),
        );
      if (existing && existing.sha256 !== doc.sha256) throw new Error('hub:version_changed');
      if (existing?.publishedAt) return;
      if (existing) {
        await tx.update(schema.legalDocuments).set({ publishedAt: new Date() }).where(eq(schema.legalDocuments.id, existing.id));
        return;
      }
      await tx.insert(schema.legalDocuments).values({
        kind: doc.kind as (typeof schema.legalKind.enumValues)[number],
        locale: doc.locale,
        version: doc.version,
        title: doc.title,
        bodyMd: doc.bodyMd,
        sha256: doc.sha256,
        summary: doc.summary,
        requiresAcceptance: doc.requiresAcceptance,
        publishedAt: new Date(),
        createdBy: ctx.userId,
      });
    }),
  );
}
