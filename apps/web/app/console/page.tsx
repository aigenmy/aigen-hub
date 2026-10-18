import { schema } from '@hub/db';
import { Card, CardHeader, KpiTile, Table, TD, TH } from '@hub/ui';
import { and, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { asUser } from '@/lib/db';
import { requireStaff } from '@/lib/session';

export default async function ConsoleToday() {
  const ctx = await requireStaff('/console');
  const t = await getTranslations('console.today');
  const tc = await getTranslations('common');
  const f = await getFormatter();

  const data = await asUser(ctx.claims, async (tx) => {
    const [[companies], [newWeek], [members], [staff], newest, staffActivity] = await Promise.all([
      tx.select({ n: count() }).from(schema.companies).where(isNull(schema.companies.deletedAt)),
      tx.select({ n: count() }).from(schema.companies).where(and(isNull(schema.companies.deletedAt), gt(schema.companies.createdAt, sql`now() - interval '7 days'`))),
      tx.select({ n: count() }).from(schema.companyMembers).where(eq(schema.companyMembers.status, 'active')),
      tx.select({ n: count() }).from(schema.profiles).where(eq(schema.profiles.isStaff, true)),
      tx
        .select({ id: schema.companies.id, name: schema.companies.name, planId: schema.companies.planId, createdAt: schema.companies.createdAt })
        .from(schema.companies)
        .where(isNull(schema.companies.deletedAt))
        .orderBy(desc(schema.companies.createdAt))
        .limit(8),
      tx
        .select({ id: schema.auditLog.id, action: schema.auditLog.action, objectId: schema.auditLog.objectId, createdAt: schema.auditLog.createdAt, actor: schema.profiles.fullName })
        .from(schema.auditLog)
        .leftJoin(schema.profiles, eq(schema.profiles.id, schema.auditLog.actorId))
        .where(eq(schema.auditLog.actorType, 'staff'))
        .orderBy(desc(schema.auditLog.createdAt))
        .limit(10),
    ]);
    return { companies: companies?.n ?? 0, newWeek: newWeek?.n ?? 0, members: members?.n ?? 0, staff: staff?.n ?? 0, newest, staffActivity };
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t('companies')} value={data.companies} />
        <KpiTile label={t('newWeek')} value={data.newWeek} />
        <KpiTile label={t('members')} value={data.members} />
        <KpiTile label={t('staff')} value={data.staff} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('recent')} />
          <Table>
            <tbody>
              {data.newest.map((c) => (
                <tr key={c.id}>
                  <TD>
                    <Link href={`/console/companies/${c.id}`} className="font-medium text-accent-strong hover:underline">
                      {c.name}
                    </Link>
                  </TD>
                  <TD className="text-sm text-text-2">{tc(`plans.${c.planId}` as 'plans.free')}</TD>
                  <TD className="text-right text-sm text-text-2">{f.relativeTime(c.createdAt)}</TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title={t('activity')} />
          {data.staffActivity.length ? (
            <Table>
              <thead>
                <tr>
                  <TH>{t('when')}</TH>
                  <TH>{t('who')}</TH>
                  <TH>{t('what')}</TH>
                </tr>
              </thead>
              <tbody>
                {data.staffActivity.map((a) => (
                  <tr key={a.id}>
                    <TD className="whitespace-nowrap text-sm text-text-2">{f.relativeTime(a.createdAt)}</TD>
                    <TD className="text-sm">{a.actor ?? '—'}</TD>
                    <TD className="text-sm">
                      <code className="text-xs">{a.action}</code> <span className="text-text-2">{a.objectId}</span>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-4 text-sm text-text-2">{t('noActivity')}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
