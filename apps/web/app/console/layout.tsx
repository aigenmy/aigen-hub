import { Badge, HubMark } from '@hub/ui';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/language-switcher';
import { PathTabs } from '@/components/path-tabs';
import { currentPath } from '@/lib/path';
import { requireStaff } from '@/lib/session';

export const metadata: Metadata = { title: { default: 'Console', template: '%s · Console · AIGen Hub' } };

// AIGen staff only: profile flag + 2-step sign-in in this session. The database checks the same thing on every query.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireStaff(await currentPath('/console'));
  const t = await getTranslations('console');
  const tc = await getTranslations('common');
  const tabs = [
    { href: '/console', label: t('tabs.today') },
    { href: '/console/companies', label: t('tabs.companies') },
    { href: '/console/plans', label: t('tabs.plans') },
    { href: '/console/flags', label: t('tabs.flags') },
    { href: '/console/legal', label: t('tabs.legal') },
  ];
  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-border px-4 py-2.5 sm:px-6">
        <Link href="/home" className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text">
          <ArrowLeft className="size-4" aria-hidden />
          {tc('nav.backToApp')}
        </Link>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <HubMark size={22} />
        <span className="font-semibold">{t('title')}</span>
        <Badge tone="warning">{t('badge')}</Badge>
        <span className="ml-auto">
          <LanguageSwitcher compact />
        </span>
      </header>
      <PathTabs tabs={tabs} label={t('title')} />
      <div className="px-4 pb-10 pt-5 sm:px-6">{children}</div>
    </div>
  );
}
