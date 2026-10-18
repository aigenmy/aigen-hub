'use client';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { acceptInvitationAction } from '@/app/actions/invite';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';

export function AcceptInviteButton({ token }: { token: string }) {
  const t = useTranslations('team.join');
  const [state, action] = useActionState<FormState, FormData>(acceptInvitationAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />
      <SubmitButton className="w-full">{t('accept')}</SubmitButton>
    </form>
  );
}
