import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { AuthShell } from '@/components/auth-shell';
import { safeNext } from '@/lib/safe-next';
import { getClaims } from '@/lib/session';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, '/onboarding');
  if (await getClaims()) redirect(next);
  const t = await getTranslations('auth');
  return (
    <AuthShell title={t('signup.title')} subtitle={t('signup.subtitle')}>
      <SignupForm locale={await getLocale()} next={next} />
      <p className="mt-6 text-center text-sm text-text-2">
        {t('signup.haveAccount')}{' '}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-accent-strong hover:underline">
          {t('signup.signIn')}
        </Link>
      </p>
    </AuthShell>
  );
}
