import { getTranslations } from 'next-intl/server';
import { PageBody, PageHeader } from '@/components/app-shell';
import { PathTabs } from '@/components/path-tabs';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('settings');
  const tabs = (['profile', 'company', 'security', 'plan', 'legal'] as const).map((k) => ({ href: `/settings/${k}`, label: t(`tabs.${k}`) }));
  return (
    <>
      <PageHeader title={t('title')} />
      <PathTabs tabs={tabs} label={t('title')} />
      <PageBody className="pt-5">
        <div className="max-w-3xl space-y-4">{children}</div>
      </PageBody>
    </>
  );
}
