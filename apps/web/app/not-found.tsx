import { buttonClass } from '@hub/ui';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/auth-shell';

export default async function NotFound() {
  const t = await getTranslations('common');
  return (
    <AuthShell title={t('notFound.title')} subtitle={t('notFound.text')}>
      <Link href="/home" className={buttonClass('primary', 'md', 'w-full')}>
        {t('notFound.home')}
      </Link>
    </AuthShell>
  );
}
