import { previewInvitation } from '@hub/db';
import { buttonClass } from '@hub/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { signOutAction } from '@/app/actions/auth';
import { AuthShell } from '@/components/auth-shell';
import { asUser } from '@/lib/db';
import { getContext, requireUser } from '@/lib/session';
import { AcceptInviteButton } from './accept-button';

export const metadata: Metadata = { title: 'Invitation' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const here = `/invite/${encodeURIComponent(token)}`;
  const t = await getTranslations('team.join');
  const tc = await getTranslations('common');

  if (!(await getContext())) {
    return (
      <AuthShell title={t('title')} subtitle={t('signedOut')}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/login?next=${encodeURIComponent(here)}`} className={buttonClass('primary', 'md', 'flex-1')}>
            {t('signIn')}
          </Link>
          <Link href={`/signup?next=${encodeURIComponent(here)}`} className={buttonClass('secondary', 'md', 'flex-1')}>
            {t('createAccount')}
          </Link>
        </div>
      </AuthShell>
    );
  }

  const ctx = await requireUser(here);
  const p = await asUser(ctx.claims, (tx) => previewInvitation(tx, token));

  if (p.status !== 'open') {
    return (
      <AuthShell title={t('title')}>
        <p className="text-base text-text-2">{t(`status.${p.status}`)}</p>
        <Link href="/home" className={buttonClass('secondary', 'md', 'mt-6 w-full')}>
          {t('goHome')}
        </Link>
      </AuthShell>
    );
  }

  if (!p.emailMatches) {
    return (
      <AuthShell title={t('title')}>
        <p className="text-base text-text-2">{t('wrongEmail', { email: ctx.profile.email })}</p>
        <form action={signOutAction} className="mt-6">
          <button type="submit" className={buttonClass('secondary', 'md', 'w-full')}>
            {t('switchAccount')}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('heading', { company: p.companyName ?? '' })} subtitle={t('asRole', { role: tc(`roles.${p.role ?? 'agent'}`) })}>
      <AcceptInviteButton token={token} />
    </AuthShell>
  );
}
