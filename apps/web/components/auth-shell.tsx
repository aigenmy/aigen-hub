import { HubLogo } from '@hub/ui';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from './language-switcher';

/** Centered card for sign-in, sign-up, onboarding and other pages outside the app shell. */
export async function AuthShell({
  title,
  subtitle,
  children,
  wide,
  aside,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  aside?: React.ReactNode;
}) {
  const t = await getTranslations('common');
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(1200px_500px_at_50%_-120px,#e3f5ff_0%,#f6f8fb_60%)]">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="AIGen Hub">
          <HubLogo size={30} />
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-4 sm:pt-10">
        <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-[420px]'}>
          <div className="rounded-lg border border-border bg-surface p-6 shadow-card sm:p-8">
            <h1 className="text-xl font-semibold text-text">{title}</h1>
            {subtitle ? <p className="mt-1 text-base text-text-2">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
          </div>
          {aside ? <div className="mt-4">{aside}</div> : null}
        </div>
      </main>
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-6 text-xs text-text-2">
        <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
        <Link href="/legal/terms" className="hover:text-text">
          {t('footer.terms')}
        </Link>
        <Link href="/legal/privacy" className="hover:text-text">
          {t('footer.privacy')}
        </Link>
      </footer>
    </div>
  );
}
