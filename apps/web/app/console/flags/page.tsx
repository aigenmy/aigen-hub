import { schema } from '@hub/db';
import { Card, CardHeader } from '@hub/ui';
import { asc } from 'drizzle-orm';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { asUser } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { FlagsList, PlatformSwitches } from './client';

export const metadata: Metadata = { title: 'Flags' };

export default async function ConsoleFlags() {
  const ctx = await requireStaff('/console/flags');
  const t = await getTranslations('console.flags');
  const [flags, settings] = await asUser(ctx.claims, (tx) =>
    Promise.all([
      tx.select().from(schema.featureFlags).orderBy(asc(schema.featureFlags.key)),
      tx.select().from(schema.platformSettings),
    ]),
  );
  const bool = (k: string) => settings.find((s) => s.key === k)?.value === true;
  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={t('platform')} />
        <PlatformSwitches values={{ billing_enabled: bool('billing_enabled'), signups_open: bool('signups_open'), beta: bool('beta') }} />
      </Card>
      <Card>
        <CardHeader title={t('title')} />
        <FlagsList flags={flags.map((f) => ({ key: f.key, description: f.description, enabled: f.enabled, rolloutPercent: f.rolloutPercent }))} />
      </Card>
    </div>
  );
}
