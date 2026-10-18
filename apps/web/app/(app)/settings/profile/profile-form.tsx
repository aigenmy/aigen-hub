'use client';
import { LOCALE_LABELS, LOCALES } from '@hub/i18n';
import { Field, Input, Select, toast } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect } from 'react';
import { updateProfileAction } from '@/app/actions/settings';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';
import { TIMEZONES } from '@/lib/constants';

export function ProfileForm(p: { fullName: string; email: string; locale: string; timezone: string }) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});
  useEffect(() => {
    if (state.ok) toast.success(t('profile.saved'));
  }, [state, t]);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label={t('profile.name')} htmlFor="fullName">
        <Input id="fullName" name="fullName" required maxLength={120} defaultValue={p.fullName} autoComplete="name" />
      </Field>
      <Field label={t('profile.email')} htmlFor="email" hint={t('profile.emailHint')}>
        <Input id="email" value={p.email} readOnly disabled />
      </Field>
      <Field label={tc('language')} htmlFor="locale">
        <Select id="locale" name="locale" defaultValue={p.locale}>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('profile.timezone')} htmlFor="timezone">
        <Select id="timezone" name="timezone" defaultValue={p.timezone}>
          {TIMEZONES.map((z) => (
            <option key={z} value={z}>
              {z.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </Field>
      <div className="space-y-3 sm:col-span-2">
        <FormError state={state} />
        <SubmitButton>{tc('save')}</SubmitButton>
      </div>
    </form>
  );
}
