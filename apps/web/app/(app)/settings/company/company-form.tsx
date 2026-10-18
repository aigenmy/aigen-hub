'use client';
import { LOCALE_LABELS, LOCALES } from '@hub/i18n';
import { Field, Input, Select, toast } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect } from 'react';
import { updateCompanyAction } from '@/app/actions/company';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';
import { COMPANY_TYPES, TIMEZONES } from '@/lib/constants';

export function CompanySettingsForm(p: { editable: boolean; name: string; type: string; locale: string; timezone: string }) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [state, action] = useActionState<FormState, FormData>(updateCompanyAction, {});
  useEffect(() => {
    if (state.ok) toast.success(t('company.saved'));
  }, [state, t]);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <fieldset disabled={!p.editable} className="contents">
        <Field label={t('company.name')} htmlFor="name" className="sm:col-span-2">
          <Input id="name" name="name" required minLength={2} maxLength={120} defaultValue={p.name} />
        </Field>
        <Field label={t('company.type')} htmlFor="type">
          <Select id="type" name="type" defaultValue={p.type}>
            {COMPANY_TYPES.map((c) => (
              <option key={c} value={c}>
                {tc(`companyTypes.${c}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('company.language')} htmlFor="locale">
          <Select id="locale" name="locale" defaultValue={p.locale}>
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('company.timezone')} htmlFor="timezone">
          <Select id="timezone" name="timezone" defaultValue={p.timezone}>
            {TIMEZONES.map((z) => (
              <option key={z} value={z}>
                {z.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>
      {p.editable ? (
        <div className="space-y-3 sm:col-span-2">
          <FormError state={state} />
          <SubmitButton>{tc('save')}</SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
