'use client';
import { LOCALE_LABELS, LOCALES } from '@hub/i18n';
import { Field, Input, Select } from '@hub/ui';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { signupAction } from '@/app/actions/auth';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';

export function SignupForm({ locale, next }: { locale: string; next: string }) {
  const t = useTranslations('auth');
  const [state, action] = useActionState<FormState, FormData>(signupAction, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label={t('signup.name')} htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" required defaultValue={v.fullName} maxLength={120} />
      </Field>
      <Field label={t('signup.email')} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} />
      </Field>
      <Field label={t('signup.password')} htmlFor="password" hint={t('signup.passwordHint')}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label={t('signup.language')} htmlFor="locale">
        <Select id="locale" name="locale" defaultValue={v.locale ?? locale}>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </Select>
      </Field>
      <p className="text-xs text-text-2">
        {t.rich('signup.legal', {
          terms: (c) => (
            <Link href="/legal/terms" target="_blank" className="text-accent-strong underline">
              {c}
            </Link>
          ),
          privacy: (c) => (
            <Link href="/legal/privacy" target="_blank" className="text-accent-strong underline">
              {c}
            </Link>
          ),
        })}
      </p>
      <FormError state={state} />
      <SubmitButton className="w-full">{t('signup.submit')}</SubmitButton>
    </form>
  );
}
