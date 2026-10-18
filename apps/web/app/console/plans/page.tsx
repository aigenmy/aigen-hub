import { schema } from '@hub/db';
import { MODULES } from '@hub/modules';
import { Card, CardHeader } from '@hub/ui';
import { asc } from 'drizzle-orm';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { moduleKey } from '@/components/app-shell';
import { asUser } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { PlanForm, PlanModulesMatrix } from './client';

export const metadata: Metadata = { title: 'Plans' };

export default async function ConsolePlans() {
  const ctx = await requireStaff('/console/plans');
  const t = await getTranslations('console.plans');
  const tc = await getTranslations('common');
  const [plans, planModules] = await asUser(ctx.claims, (tx) =>
    Promise.all([tx.select().from(schema.plans).orderBy(asc(schema.plans.sort)), tx.select().from(schema.planModules)]),
  );
  const modules = MODULES.filter((m) => !m.staffOnly && !m.core).map((m) => ({ id: m.id, label: tc(`modules.${moduleKey(m.id)}` as 'modules.home') }));

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-text-2">{t('note')}</p>
      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader title={tc(`plans.${p.id}` as 'plans.free')} description={p.isCustom ? t('custom') : undefined} />
            <div className="p-4">
              <PlanForm plan={{ ...p, updatedAt: p.updatedAt.toISOString() }} />
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title={t('modules')} />
        <PlanModulesMatrix
          plans={plans.map((p) => ({ id: p.id, label: tc(`plans.${p.id}` as 'plans.free') }))}
          modules={modules}
          included={planModules.map((pm) => `${pm.planId}:${pm.moduleId}`)}
        />
      </Card>
    </div>
  );
}
