import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/auth-shell';
import { asUser } from '@/lib/db';
import { pendingLegalDocuments } from '@/lib/legal';
import { safeNext } from '@/lib/safe-next';
import { getContext } from '@/lib/session';
import { AcceptForm } from './accept-form';

export const metadata: Metadata = { title: 'Accept' };

export default async function AcceptPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const ctx = await getContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(`/accept?next=${next}`)}`);
  const docs = await asUser(ctx.claims, (tx) => pendingLegalDocuments(tx, ctx.userId));
  if (!docs.length) redirect(next);
  const t = await getTranslations('legal');
  const f = await getFormatter();
  return (
    <AuthShell title={t('accept.title')} subtitle={t('accept.text')}>
      <ul className="divide-y divide-border rounded-md border border-border">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <a href={`/legal/${d.kind}`} target="_blank" rel="noreferrer" className="font-medium text-accent-strong hover:underline">
              {t(`kinds.${d.kind}` as 'kinds.terms')}
            </a>
            <span className="text-xs text-text-2">{t('accept.updated', { date: f.dateTime(d.publishedAt, 'short') })}</span>
          </li>
        ))}
      </ul>
      <AcceptForm next={next} />
    </AuthShell>
  );
}
