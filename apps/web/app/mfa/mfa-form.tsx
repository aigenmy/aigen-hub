'use client';
import { Field, Input } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { mfaChallengeAction } from '@/app/actions/auth';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';

export function MfaForm({ next }: { next: string }) {
  const t = useTranslations('auth');
  const [state, action] = useActionState<FormState, FormData>(mfaChallengeAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label={t('mfa.code')} htmlFor="code">
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className="text-center text-lg tracking-[0.3em]"
        />
      </Field>
      <FormError state={state} />
      <SubmitButton className="w-full">{t('mfa.submit')}</SubmitButton>
    </form>
  );
}
