import { schema } from '@hub/db';
import { formatRM } from '@hub/i18n';
import { moduleById } from '@hub/modules';
import { Badge, Card, CardHeader, Table, TD, TH } from '@hub/ui';
import { asc, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { moduleKey } from '@/components/app-shell';
import { asUser } from '@/lib/db';
import { seatsUsed } from '@/lib/queries';
import { requireCompany } from '@/lib/session';

export const metadata: Metadata = { title: 'Plan' };

export default async function PlanPage() {
  const ctx = await requireCompany('/settings/plan');
  const t = await getTranslations('settings.plan');
  const tc = await getTranslations('common');
  const [used, plans] = await asUser(ctx.claims, async (tx) =>
    Promise.all([
      seatsUsed(tx, ctx.company.id),
      tx.select().from(schema.plans).where(eq(schema.plans.isPublic, true)).orderBy(asc(schema.plans.sort)),
    ]),
  );
  const modules = ctx.entitlements
    .map((id) => moduleById(id))
    .filter((m) => m && !m.staffOnly)
    .sort((a, b) => a!.phase - b!.phase);

  return (
    <>
      <Card>
        <CardHeader
          title={t('current')}
          action={ctx.company.isFounder ? <Badge tone="accent">{tc('founder')}</Badge> : null}
        />
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <div>
            <div className="text-sm text-text-2">{t('plan')}</div>
            <div className="mt-1 text-lg font-semibold">{tc(`plans.${ctx.company.planId}` as 'plans.free')}</div>
          </div>
          <div>
            <div className="text-sm text-text-2">{t('seats')}</div>
            <div className="mt-1 text-lg font-semibold">{t('seatsValue', { used, limit: ctx.company.seatsLimit })}</div>
          </div>
          <div>
            <div className="text-sm text-text-2">{t('status')}</div>
            <div className="mt-1 text-lg font-semibold">{tc(`planStatus.${ctx.company.planStatus}`)}</div>
          </div>
        </div>
        <div className="space-y-1 border-t border-border px-4 py-3 text-sm text-text-2">
          <p>{t('beta')}</p>
          {ctx.company.isFounder ? <p>{t('founder')}</p> : null}
          <p>{ctx.role === 'owner' ? t('contact') : t('ownerOnly')}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('modules')} />
        <ul className="grid gap-x-6 gap-y-2 p-4 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m!.id} className="flex items-center justify-between gap-2 text-base">
              <span>{tc(`modules.${moduleKey(m!.id)}` as 'modules.home')}</span>
              {m!.built ? <Badge tone="success">{t('ready')}</Badge> : <Badge>{t('coming')}</Badge>}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title={t('ladder')} description={t('sstNote')} />
        <Table>
          <thead>
            <tr>
              <TH>{t('plan')}</TH>
              <TH>{t('price')}</TH>
              <TH>{t('seats')}</TH>
              <TH className="hidden sm:table-cell">{t('assistsCol')}</TH>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className={p.id === ctx.company.planId ? 'bg-accent-tint/50' : undefined}>
                <TD className="font-medium">
                  {tc(`plans.${p.id}` as 'plans.free')}
                  {p.id === ctx.company.planId ? (
                    <Badge tone="accent" className="ml-2">
                      {t('yours')}
                    </Badge>
                  ) : null}
                </TD>
                <TD>{p.isCustom ? t('quote') : t('perMonth', { price: formatRM(p.priceMonthlySen) })}</TD>
                <TD>{t('seatsIncluded', { count: p.seatsIncluded })}</TD>
                <TD className="hidden sm:table-cell">{p.isCustom ? t('custom') : t('assists', { count: p.aiAssistsMonth })}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
