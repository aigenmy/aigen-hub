import { schema } from '@hub/db';
import { LEGAL_KINDS } from '@hub/legal';
import { Card, CardHeader, Table, TD, TH } from '@hub/ui';
import { desc, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { asUser } from '@/lib/db';
import { requireCompany } from '@/lib/session';

export const metadata: Metadata = { title: 'Legal' };

export default async function LegalSettingsPage() {
  const ctx = await requireCompany('/settings/legal');
  const t = await getTranslations('settings.legal');
  const tl = await getTranslations('legal');
  const f = await getFormatter();
  const rows = await asUser(ctx.claims, (tx) =>
    tx
      .select({
        id: schema.legalAcceptances.id,
        kind: schema.legalDocuments.kind,
        version: schema.legalDocuments.version,
        acceptedAt: schema.legalAcceptances.acceptedAt,
      })
      .from(schema.legalAcceptances)
      .innerJoin(schema.legalDocuments, eq(schema.legalDocuments.id, schema.legalAcceptances.documentId))
      .where(eq(schema.legalAcceptances.userId, ctx.userId))
      .orderBy(desc(schema.legalAcceptances.acceptedAt)),
  );
  return (
    <>
      <Card>
        <CardHeader title={t('title')} description={t('text')} />
        <Table>
          <thead>
            <tr>
              <TH>{t('document')}</TH>
              <TH>{t('version')}</TH>
              <TH>{t('accepted')}</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <TD>
                  <Link href={`/legal/${r.kind}`} target="_blank" className="text-accent-strong hover:underline">
                    {tl(`kinds.${r.kind}`)}
                  </Link>
                </TD>
                <TD className="text-sm text-text-2">{r.version}</TD>
                <TD className="text-sm text-text-2">{f.dateTime(r.acceptedAt, 'long')}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title={t('all')} />
        <ul className="grid gap-2 p-4 sm:grid-cols-2">
          {LEGAL_KINDS.map((k) => (
            <li key={k}>
              <Link href={`/legal/${k}`} target="_blank" className="text-base text-accent-strong hover:underline">
                {tl(`kinds.${k}`)}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
