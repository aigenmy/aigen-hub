'use client';
import { LOCALE_LABELS, LOCALES, type Locale } from '@hub/i18n';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocaleAction } from '@/app/actions/auth';

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-text-2">
      <Languages className="size-4" aria-hidden />
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        disabled={pending}
        aria-label={t('language')}
        onChange={(e) => {
          const next = e.target.value as Locale;
          start(async () => {
            await setLocaleAction(next);
            router.refresh();
          });
        }}
        className="h-8 rounded-md border border-transparent bg-transparent pr-1 text-sm text-text-2 hover:border-border focus:border-accent focus:outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {compact ? l.toUpperCase() : LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
