'use client';
import { Button, Field, Input } from '@hub/ui';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { googleAction, loginAction, magicLinkAction } from '@/app/actions/auth';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton } from '@/components/forms';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export function LoginForm({ next, local, google, initialError }: { next: string; local: boolean; google: boolean; initialError?: string }) {
  const t = useTranslations('auth');
  const [state, action] = useActionState<FormState, FormData>(loginAction, initialError ? { error: initialError } : {});
  const [linkState, linkAction] = useActionState<FormState, FormData>(magicLinkAction, {});
  const [email, setEmail] = useState(state.values?.email ?? '');

  return (
    <div className="space-y-5">
      {google ? (
        <>
          <form action={googleAction}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="secondary" className="w-full">
              <GoogleIcon />
              {t('login.google')}
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-text-3">
            <span className="h-px flex-1 bg-border" />
            {t('login.or')}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label={t('login.email')} htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t('login.password')} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormError state={state} />
        <SubmitButton className="w-full">{t('login.submit')}</SubmitButton>
      </form>

      {!local ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <form action={linkAction}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="font-medium text-accent-strong hover:underline disabled:opacity-50" disabled={!email}>
              {t('login.magicLink')}
            </button>
          </form>
          <Link href="/forgot" className="text-text-2 hover:text-text">
            {t('login.forgot')}
          </Link>
        </div>
      ) : null}
      {linkState.ok ? (
        <p role="status" className="rounded-md bg-success-tint px-3 py-2 text-sm text-success">
          {t('login.magicLinkSent', { email: linkState.values?.email ?? email })}
        </p>
      ) : (
        <FormError state={linkState} />
      )}
    </div>
  );
}
