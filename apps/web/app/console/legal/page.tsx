import { schema } from '@hub/db';
import { LEGAL_DOCS, OPERATOR_MISSING } from '@hub/legal';
import { Badge, Card, CardHeader, Table, TD, TH, WarningBox } from '@hub/ui';
import { count } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { asUser } from '@/lib/db';
import { isLocalMode } from '@/lib/env';
import { requireStaff } from '@/lib/session';
import { PublishButton } from './client';

export const metadata: Metadata = { title: 'Legal' };

export default async function ConsoleLegal() {
  const ctx = await requireStaff('/console/legal');
  const t = await getTranslations('console.legal');
  const tl = await getTranslations('legal');
  const f = await getFormatter();
  const [published, acceptances] = await asUser(ctx.claims, (tx) =>
    Promise.all([
      tx.select().from(schema.legalDocuments),
      tx
        .select({ documentId: schema.legalAcceptances.documentId, n: count() })
        .from(schema.legalAcceptances)
        .groupBy(schema.legalAcceptances.documentId),
    ]),
  );
  const blocked = OPERATOR_MISSING.length > 0 && !isLocalMode();

  return (
    <div className="max-w-5xl space-y-4">
      {OPERATOR_MISSING.length ? (
        <WarningBox title={t('operatorTitle')}>
          {t('operatorText', { fields: OPERATOR_MISSING.join(', ') })}
          {isLocalMode() ? <span className="mt-1 block">{t('operatorLocal')}</span> : null}
        </WarningBox>
      ) : null}
      <Card>
        <CardHeader title={t('title')} description={t('text')} />
        <Table>
          <thead>
            <tr>
              <TH>{t('document')}</TH>
              <TH>{t('version')}</TH>
              <TH>{t('status')}</TH>
              <TH className="hidden sm:table-cell">{t('accepted')}</TH>
              <TH className="w-28 text-right">
                <span className="sr-only">{t('publish')}</span>
              </TH>
            </tr>
          </thead>
          <tbody>
            {LEGAL_DOCS.filter((d) => d.locale === 'en').map((d) => {
              const row = published.find((p) => p.kind === d.kind && p.locale === d.locale && p.version === d.version);
              const changed = row && row.sha256 !== d.sha256;
              const live = row?.publishedAt && !changed;
              const n = row ? (acceptances.find((a) => a.documentId === row.id)?.n ?? 0) : 0;
              return (
                <tr key={d.kind}>
                  <TD>
                    <Link href={`/legal/${d.kind}`} target="_blank" className="font-medium text-accent-strong hover:underline">
                      {tl(`kinds.${d.kind}`)}
                    </Link>
                    {d.requiresAcceptance ? <Badge className="ml-2">{t('mustAccept')}</Badge> : null}
                  </TD>
                  <TD className="text-sm">{d.version}</TD>
                  <TD className="text-sm">
                    {changed ? (
                      <Badge tone="danger">{t('changed')}</Badge>
                    ) : live ? (
                      <Badge tone="success">{t('published', { date: f.dateTime(row.publishedAt!, 'short') })}</Badge>
                    ) : (
                      <Badge tone="warning">{t('notPublished')}</Badge>
                    )}
                  </TD>
                  <TD className="hidden text-sm text-text-2 sm:table-cell">{row ? n : '—'}</TD>
                  <TD className="text-right">
                    {!live && !changed ? <PublishButton kind={d.kind} title={tl(`kinds.${d.kind}`)} version={d.version} disabled={blocked} /> : null}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
