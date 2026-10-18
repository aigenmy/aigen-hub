import { buttonClass } from '@hub/ui';
import { MailCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/auth-shell';

export const metadata: Metadata = { title: 'Check your email' };

export default async function CheckEmailPage() {
  const t = await getTranslations('auth');
  return (
    <AuthShell title={t('checkEmail.title')}>
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-accent-strong" aria-hidden />
        <p className="text-base text-text-2">{t('checkEmail.text')}</p>
      </div>
      <Link href="/login" className={buttonClass('secondary', 'md', 'mt-6 w-full')}>
        {t('checkEmail.back')}
      </Link>
    </AuthShell>
  );
}
