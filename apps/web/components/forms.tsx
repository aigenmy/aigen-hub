'use client';
import { Button } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/app/actions/types';

export function SubmitButton({
  children,
  variant = 'primary',
  className,
  disabled,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending} disabled={disabled} className={className}>
      {children}
    </Button>
  );
}

/** Shows the translated error of a form action (errors.<code>), with a generic fallback. */
export function FormError({ state }: { state: FormState }) {
  const t = useTranslations('errors');
  if (!state.error) return null;
  const key = state.error as Parameters<typeof t>[0];
  return (
    <p role="alert" className="rounded-md border border-[#f5caca] bg-danger-tint px-3 py-2 text-sm text-danger">
      {t.has(key) ? t(key) : t('generic')}
    </p>
  );
}

export function useErrorText() {
  const t = useTranslations('errors');
  return (code: string | null | undefined) => {
    if (!code) return t('generic');
    const key = code as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : t('generic');
  };
}
