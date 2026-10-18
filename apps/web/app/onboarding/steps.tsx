'use client';
import { LOCALE_LABELS, LOCALES } from '@hub/i18n';
import { buttonClass, Field, Input, Select } from '@hub/ui';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { createCompanyAction } from '@/app/actions/company';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';
import { InviteForm } from '@/components/invite-form';
import { COMPANY_TYPES } from '@/lib/constants';

export function CompanyForm({ locale }: { locale: string }) {
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');
  const [state, action] = useActionState<FormState, FormData>(createCompanyAction, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label={t('company.name')} htmlFor="name">
        <Input id="name" name="name" required minLength={2} maxLength={120} placeholder={t('company.namePlaceholder')} defaultValue={v.name} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('company.type')} htmlFor="type">
          <Select id="type" name="type" defaultValue={v.type ?? 'retail'}>
            {COMPANY_TYPES.map((c) => (
              <option key={c} value={c}>
                {tc(`companyTypes.${c}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('company.language')} htmlFor="locale">
          <Select id="locale" name="locale" defaultValue={v.locale ?? locale}>
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <FormError state={state} />
      <SubmitButton>{t('company.submit')}</SubmitButton>
    </form>
  );
}

export function InviteStep() {
  const t = useTranslations('onboarding');
  return (
    <div className="space-y-4">
      <InviteForm />
      <Link href="/onboarding?step=done" className={buttonClass('ghost', 'md')}>
        {t('team.skip')}
      </Link>
    </div>
  );
}
