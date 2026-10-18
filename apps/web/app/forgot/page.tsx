'use client';
import { Field, Input } from '@hub/ui';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { forgotAction } from '@/app/actions/auth';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';
import { ClientAuthCard } from '@/components/client-auth-card';

export default function ForgotPage() {
  const t = useTranslations('auth');
  const [state, action] = useActionState<FormState, FormData>(forgotAction, {});
  return (
    <ClientAuthCard title={t('forgot.title')} subtitle={t('forgot.text')}>
      {state.ok ? (
        <p role="status" className="rounded-md bg-success-tint px-3 py-2 text-sm text-success">
          {t('forgot.sent', { email: state.values?.email ?? '' })}
        </p>
      ) : (
        <form action={action} className="space-y-4">
          <Field label={t('login.email')} htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
          </Field>
          <FormError state={state} />
          <SubmitButton className="w-full">{t('forgot.submit')}</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-accent-strong hover:underline">
          {t('checkEmail.back')}
        </Link>
      </p>
    </ClientAuthCard>
  );
}
