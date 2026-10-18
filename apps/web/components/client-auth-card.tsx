'use client';
import { HubLogo } from '@hub/ui';
import Link from 'next/link';
import { LanguageSwitcher } from './language-switcher';

/** Client-side twin of AuthShell for small pages that are client components. */
export function ClientAuthCard({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(1200px_500px_at_50%_-120px,#e3f5ff_0%,#f6f8fb_60%)]">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="AIGen Hub">
          <HubLogo size={30} />
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-4 sm:pt-10">
        <div className="w-full max-w-[420px] rounded-lg border border-border bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold text-text">{title}</h1>
          {subtitle ? <p className="mt-1 text-base text-text-2">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
