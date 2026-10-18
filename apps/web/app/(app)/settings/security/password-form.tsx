'use client';
import { Field, Input, toast } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef } from 'react';
import { changePasswordAction } from '@/app/actions/settings';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';

export function PasswordForm() {
  const t = useTranslations('settings');
  const ta = useTranslations('auth');
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      toast.success(t('security.password.changed'));
      ref.current?.reset();
    }
  }, [state, t]);
  return (
    <form ref={ref} action={action} className="max-w-sm space-y-3">
      <Field label={t('security.password.new')} htmlFor="password" hint={ta('signup.passwordHint')}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormError state={state} />
      <SubmitButton variant="secondary">{t('security.password.submit')}</SubmitButton>
    </form>
  );
}
