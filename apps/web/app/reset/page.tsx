'use client';
import { buttonClass, Field, Input } from '@hub/ui';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { resetPasswordAction } from '@/app/actions/auth';
import type { FormState } from '@/app/actions/types';
import { ClientAuthCard } from '@/components/client-auth-card';
import { FormError, SubmitButton } from '@/components/forms';

// Reached from the password-reset email (the link signs the person in first, via /auth/callback).
export default function ResetPage() {
  const t = useTranslations('auth');
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <ClientAuthCard title={t('reset.title')}>
      {state.ok ? (
        <>
          <p role="status" className="rounded-md bg-success-tint px-3 py-2 text-sm text-success">
            {t('reset.done')}
          </p>
          <Link href="/home" className={buttonClass('primary', 'md', 'mt-4 w-full')}>
            {t('reset.continue')}
          </Link>
        </>
      ) : (
        <form action={action} className="space-y-4">
          <Field label={t('reset.password')} htmlFor="password" hint={t('signup.passwordHint')}>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <FormError state={state} />
          <SubmitButton className="w-full">{t('reset.submit')}</SubmitButton>
        </form>
      )}
    </ClientAuthCard>
  );
}
