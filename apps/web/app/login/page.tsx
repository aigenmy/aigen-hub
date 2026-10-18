import { Badge, Card } from '@hub/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { localSignInAsAction } from '@/app/actions/auth';
import { AuthShell } from '@/components/auth-shell';
import { localTestAccounts } from '@/lib/auth/local';
import { env, isLocalMode } from '@/lib/env';
import { safeNext } from '@/lib/safe-next';
import { getClaims } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getClaims()) redirect(next);
  const t = await getTranslations('auth');
  const local = isLocalMode();
  const accounts = local ? await localTestAccounts() : [];

  return (
    <AuthShell
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      aside={
        local ? (
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Badge tone="warning">{t('localMode.badge')}</Badge>
            </div>
            <p className="mt-2 text-sm text-text-2">{t('localMode.text')}</p>
            {accounts.length ? (
              <>
                <p className="mt-3 text-sm font-medium text-text">{t('localMode.accounts')}</p>
                <ul className="mt-2 grid gap-1.5">
                  {accounts.map((a) => (
                    <li key={a.email}>
                      <form action={localSignInAsAction}>
                        <input type="hidden" name="email" value={a.email} />
                        <input type="hidden" name="next" value={next} />
                        <button
                          type="submit"
                          className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:border-accent hover:bg-accent-tint"
                        >
                          <span>
                            <span className="font-medium text-text">{a.name}</span>
                            <span className="ml-2 text-text-2">{a.email}</span>
                          </span>
                          {a.isStaff ? <Badge tone="accent">Staff</Badge> : null}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>
        ) : null
      }
    >
      <LoginForm next={next} local={local} google={!local && env().GOOGLE_SIGN_IN === 'on'} initialError={sp.error} />
      <p className="mt-6 text-center text-sm text-text-2">
        {t('login.noAccount')}{' '}
        <Link href={`/signup${sp.next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-accent-strong hover:underline">
          {t('login.createAccount')}
        </Link>
      </p>
    </AuthShell>
  );
}
