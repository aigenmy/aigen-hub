import { schema } from '@hub/db';
import { MODULES } from '@hub/modules';
import { Avatar, Badge, Card, CardHeader, Table, TD, TH } from '@hub/ui';
import { asc, count, desc, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { moduleKey } from '@/components/app-shell';
import { asUser } from '@/lib/db';
import { activity, members } from '@/lib/queries';
import { requireStaff } from '@/lib/session';
import { CompanyPlanForm, ModulesTable, NotesForm } from './client';

export const metadata: Metadata = { title: 'Company' };

export default async function ConsoleCompany({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ctx = await requireStaff(`/console/companies/${id}`);
  const t = await getTranslations('console.company');
  const tc = await getTranslations('common');
  const f = await getFormatter();

  const data = await asUser(ctx.claims, async (tx) => {
    const [company] = await tx.select().from(schema.companies).where(eq(schema.companies.id, id));
    if (!company) return null;
    const [plans, planModules, overrides, people, notes, [legal], events] = await Promise.all([
      tx.select({ id: schema.plans.id }).from(schema.plans).orderBy(asc(schema.plans.sort)),
      tx.select({ moduleId: schema.planModules.moduleId }).from(schema.planModules).where(eq(schema.planModules.planId, company.planId)),
      tx.select().from(schema.companyModules).where(eq(schema.companyModules.companyId, id)),
      members(tx, id),
      tx
        .select({ id: schema.companyNotes.id, body: schema.companyNotes.body, createdAt: schema.companyNotes.createdAt, author: schema.profiles.fullName })
        .from(schema.companyNotes)
        .leftJoin(schema.profiles, eq(schema.profiles.id, schema.companyNotes.authorId))
        .where(eq(schema.companyNotes.companyId, id))
        .orderBy(desc(schema.companyNotes.createdAt)),
      tx.select({ n: count() }).from(schema.legalAcceptances).where(eq(schema.legalAcceptances.companyId, id)),
      activity(tx, id, 20),
    ]);
    return { company, plans, planModules: planModules.map((p) => p.moduleId), overrides, people, notes, legal: legal?.n ?? 0, events };
  });
  if (!data) notFound();
  const { company } = data;

  const moduleRows = MODULES.filter((m) => !m.staffOnly && !m.core).map((m) => ({
    id: m.id,
    label: tc(`modules.${moduleKey(m.id)}` as 'modules.home'),
    built: m.built,
    inPlan: data.planModules.includes(m.id),
    override: (data.overrides.find((o) => o.moduleId === m.id)?.state ?? 'default') as 'on' | 'off' | 'default',
  }));

  return (
    <div className="space-y-4">
      <Link href="/console/companies" className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text">
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{company.name}</h1>
        {company.isFounder ? <Badge tone="accent">{tc('founder')}</Badge> : null}
        {company.isInternal ? <Badge>{tc('internal')}</Badge> : null}
        <span className="text-sm text-text-2">
          · {tc(`companyTypes.${company.type}` as 'companyTypes.other')} · {f.dateTime(company.createdAt, 'short')}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={t('planCard')} />
          <div className="p-4">
            <CompanyPlanForm
              companyId={company.id}
              plans={data.plans.map((p) => ({ id: p.id, label: tc(`plans.${p.id}` as 'plans.free') }))}
              planId={company.planId}
              planStatus={company.planStatus}
              seatsLimit={company.seatsLimit}
              isFounder={company.isFounder}
              isInternal={company.isInternal}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('members')} description={t('legal', { count: data.legal })} />
          <Table>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.userId}>
                  <TD>
                    <span className="flex items-center gap-2">
                      <Avatar name={p.fullName || p.email} size={24} />
                      <span>
                        <span className="block text-sm font-medium">{p.fullName || p.email}</span>
                        <span className="block text-xs text-text-2">{p.email}</span>
                      </span>
                    </span>
                  </TD>
                  <TD className="text-sm">{tc(`roles.${p.role}`)}</TD>
                  <TD className="text-right text-xs text-text-2">{p.status === 'suspended' ? tc('suspended') : ''}</TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('modules')} description={t('modulesText')} />
        <ModulesTable companyId={company.id} rows={moduleRows} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={t('notes')} description={t('notesText')} />
          <div className="space-y-3 p-4">
            <NotesForm companyId={company.id} />
            <ul className="space-y-2">
              {data.notes.map((n) => (
                <li key={n.id} className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                  <p className="whitespace-pre-wrap text-text">{n.body}</p>
                  <p className="mt-1 text-xs text-text-2">
                    {n.author ?? '—'} · {f.dateTime(n.createdAt, 'long')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <Card>
          <CardHeader title={t('activity')} />
          <Table>
            <thead>
              <tr>
                <TH>{t('when')}</TH>
                <TH>{t('who')}</TH>
                <TH>{t('what')}</TH>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.id}>
                  <TD className="whitespace-nowrap text-xs text-text-2">{f.dateTime(e.createdAt, 'long')}</TD>
                  <TD className="text-sm">{e.actorType === 'staff' ? `${e.actorName ?? ''} (AIGen)` : (e.actorName ?? e.actorType)}</TD>
                  <TD className="text-xs">
                    <code>{e.action}</code>
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
