import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { signOutAction } from '@/app/actions/auth';
import { AuthShell } from '@/components/auth-shell';
import { safeNext } from '@/lib/safe-next';
import { getContext, needsSecondFactor } from '@/lib/session';
import { MfaForm } from './mfa-form';

export const metadata: Metadata = { title: '2-step sign-in' };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const ctx = await getContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (ctx.aal === 'aal2' || !(await needsSecondFactor())) redirect(next);
  const t = await getTranslations('auth');
  return (
    <AuthShell title={t('mfa.title')} subtitle={t('mfa.text')}>
      <MfaForm next={next} />
      <form action={signOutAction} className="mt-6 text-center">
        <button type="submit" className="text-sm text-text-2 hover:text-text">
          {t('mfa.notYou')}
        </button>
      </form>
    </AuthShell>
  );
}
