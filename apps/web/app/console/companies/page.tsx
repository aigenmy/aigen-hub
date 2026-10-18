import { schema } from '@hub/db';
import { Badge, Card, EmptyState, Input, Table, TD, TH } from '@hub/ui';
import { and, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import { Building2, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { asUser } from '@/lib/db';
import { requireStaff } from '@/lib/session';

export const metadata: Metadata = { title: 'Companies' };

export default async function ConsoleCompanies({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireStaff('/console/companies');
  const q = ((await searchParams).q ?? '').trim().slice(0, 80);
  const t = await getTranslations('console.companies');
  const tc = await getTranslations('common');
  const f = await getFormatter();

  const rows = await asUser(ctx.claims, (tx) =>
    tx
      .select({
        id: schema.companies.id,
        name: schema.companies.name,
        planId: schema.companies.planId,
        planStatus: schema.companies.planStatus,
        seatsLimit: schema.companies.seatsLimit,
        isFounder: schema.companies.isFounder,
        isInternal: schema.companies.isInternal,
        createdAt: schema.companies.createdAt,
        members: count(schema.companyMembers.userId),
      })
      .from(schema.companies)
      .leftJoin(schema.companyMembers, eq(schema.companyMembers.companyId, schema.companies.id))
      .where(and(isNull(schema.companies.deletedAt), q ? ilike(schema.companies.name, `%${q.replace(/[%_\\]/g, '\\$&')}%`) : undefined))
      .groupBy(schema.companies.id)
      .orderBy(desc(schema.companies.createdAt))
      .limit(200),
  );

  return (
    <Card>
      <form className="flex items-center gap-2 border-b border-border p-3" role="search">
        <Search className="size-4 text-text-3" aria-hidden />
        <Input name="q" defaultValue={q} placeholder={t('search')} aria-label={t('search')} className="h-8 max-w-sm" />
      </form>
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              <TH>{t('name')}</TH>
              <TH>{t('plan')}</TH>
              <TH className="hidden sm:table-cell">{t('members')}</TH>
              <TH className="hidden md:table-cell">{t('status')}</TH>
              <TH className="hidden md:table-cell">{t('created')}</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2">
                <TD>
                  <Link href={`/console/companies/${c.id}`} className="font-medium text-accent-strong hover:underline">
                    {c.name}
                  </Link>
                  {c.isFounder ? (
                    <Badge tone="accent" className="ml-2">
                      {tc('founder')}
                    </Badge>
                  ) : null}
                  {c.isInternal ? <Badge className="ml-2">{tc('internal')}</Badge> : null}
                </TD>
                <TD>{tc(`plans.${c.planId}` as 'plans.free')}</TD>
                <TD className="hidden sm:table-cell">
                  {c.members} / {c.seatsLimit}
                </TD>
                <TD className="hidden md:table-cell">{tc(`planStatus.${c.planStatus}`)}</TD>
                <TD className="hidden text-sm text-text-2 md:table-cell">{f.dateTime(c.createdAt, 'short')}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState icon={<Building2 className="size-5" aria-hidden />} text={t('empty')} />
      )}
    </Card>
  );
}
