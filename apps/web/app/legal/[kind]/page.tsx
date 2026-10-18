import { schema } from '@hub/db';
import { bundledDoc, isLegalKind, LEGAL_KINDS } from '@hub/legal';
import { Badge, HubLogo } from '@hub/ui';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/language-switcher';
import { asAnon } from '@/lib/db';

type Props = { params: Promise<{ kind: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = bundledDoc((await params).kind);
  return { title: doc?.title ?? 'Legal', robots: { index: true, follow: true } };
}

// Public page for each legal document. Shows the text in this release and whether that exact text is published.
export default async function LegalPage({ params }: Props) {
  const { kind } = await params;
  if (!isLegalKind(kind)) notFound();
  const doc = bundledDoc(kind);
  if (!doc) notFound();
  const t = await getTranslations('legal');
  const f = await getFormatter();
  const [published] = await asAnon((tx) =>
    tx
      .select({ version: schema.legalDocuments.version, sha256: schema.legalDocuments.sha256, publishedAt: schema.legalDocuments.publishedAt })
      .from(schema.legalDocuments)
      .where(and(eq(schema.legalDocuments.kind, kind), eq(schema.legalDocuments.locale, 'en'), isNotNull(schema.legalDocuments.publishedAt)))
      .orderBy(desc(schema.legalDocuments.publishedAt))
      .limit(1),
  );
  const isPublished = published?.sha256 === doc.sha256 && published.publishedAt;

  return (
    <div className="min-h-dvh bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <Link href="/" aria-label="AIGen Hub">
          <HubLogo size={28} />
        </Link>
        <LanguageSwitcher />
      </header>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_220px]">
        <article>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-2">
            {isPublished ? (
              <span>{t('page.version', { version: doc.version, date: f.dateTime(published.publishedAt!, 'short') })}</span>
            ) : (
              <Badge tone="warning">{t('page.notPublished')}</Badge>
            )}
            {doc.locale !== 'en' ? null : <span className="text-text-3">· English</span>}
          </div>
          <div className="prose-legal" dangerouslySetInnerHTML={{ __html: doc.html }} />
        </article>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-2">{t('page.otherDocs')}</p>
          <ul className="space-y-1">
            {LEGAL_KINDS.map((k) => (
              <li key={k}>
                <Link
                  href={`/legal/${k}`}
                  className={k === kind ? 'text-base font-medium text-text' : 'text-base text-accent-strong hover:underline'}
                >
                  {t(`kinds.${k}`)}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
