'use client';
import { Checkbox } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { acceptLegalAction } from '@/app/actions/legal';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';

export function AcceptForm({ next }: { next: string }) {
  const t = useTranslations('legal');
  const [state, action] = useActionState<FormState, FormData>(acceptLegalAction, {});
  const [agree, setAgree] = useState(false);
  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="next" value={next} />
      <Checkbox id="agree" name="agree" checked={agree} onCheckedChange={setAgree} required>
        {t('accept.checkbox')}
      </Checkbox>
      <FormError state={state} />
      <SubmitButton className="w-full" disabled={!agree}>
        {t('accept.submit')}
      </SubmitButton>
    </form>
  );
}
