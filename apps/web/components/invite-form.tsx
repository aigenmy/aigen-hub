'use client';
import { Button, Field, Input, Select, WarningBox, toast } from '@hub/ui';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useState } from 'react';
import { inviteAction } from '@/app/actions/team';
import type { FormState } from '@/app/actions/types';
import { INVITE_ROLES } from '@/lib/constants';
import { FormError, SubmitButton } from './forms';

/** Invite by email. Shows the one-time link afterwards (with Copy), because email may not be set up yet. */
export function InviteForm(props: { allowAdmin?: boolean; onDone?: () => void }) {
  const [round, setRound] = useState(0);
  return <InviteFormRound key={round} {...props} onAnother={() => setRound((r) => r + 1)} />;
}

function InviteFormRound({ allowAdmin = true, onDone, onAnother }: { allowAdmin?: boolean; onDone?: () => void; onAnother: () => void }) {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const [state, action] = useActionState<FormState, FormData>(inviteAction, {});
  const [understood, setUnderstood] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.ok) toast.success(t('toast.invited'));
  }, [state, t]);

  if (state.ok && state.data?.link) {
    const link = state.data.link;
    return (
      <div className="space-y-3">
        <p className="text-base font-medium text-text">{t('invite.linkTitle')}</p>
        <p className="text-sm text-text-2">{t('invite.linkText', { email: state.data.email ?? '' })}</p>
        <div className="flex gap-2">
          <Input readOnly value={link} aria-label={t('invite.linkTitle')} onFocus={(e) => e.currentTarget.select()} />
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              toast.success(t('invite.copied'));
            }}
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {t('invite.copy')}
          </Button>
        </div>
        <p className="text-xs text-text-2">{state.data.emailed ? t('invite.emailed') : t('invite.notEmailed')}</p>
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={onAnother}
          >
            {t('invite.another')}
          </Button>
          {onDone ? (
            <Button type="button" onClick={onDone}>
              {tc('done')}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label={t('invite.email')} htmlFor="invite-email">
          <Input id="invite-email" name="email" type="email" required defaultValue={state.values?.email} autoComplete="off" />
        </Field>
        <Field label={t('invite.role')} htmlFor="invite-role">
          <Select id="invite-role" name="role" defaultValue={state.values?.role ?? 'agent'}>
            {INVITE_ROLES.filter((r) => allowAdmin || r !== 'admin').map((r) => (
              <option key={r} value={r}>
                {tc(`roles.${r}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <WarningBox
        title={t('invite.warningTitle')}
        confirm={{ id: 'understood', name: 'understood', label: t('invite.understood'), checked: understood, onCheckedChange: setUnderstood }}
      >
        {t('invite.warning')}
      </WarningBox>
      <FormError state={state} />
      <SubmitButton disabled={!understood}>{t('invite.submit')}</SubmitButton>
    </form>
  );
}
