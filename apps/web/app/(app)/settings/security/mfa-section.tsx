'use client';
import { Badge, Button, ConfirmDialog, Field, Input, toast } from '@hub/ui';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { mfaEnrollAction, mfaUnenrollAction, mfaVerifyEnrollAction } from '@/app/actions/settings';
import { useErrorText } from '@/components/forms';

type Enrollment = { factorId: string; qrDataUrl: string; secret: string };

export function MfaSection({ factors, aal, isStaff }: { factors: { id: string; createdAt: string }[]; aal: 'aal1' | 'aal2'; isStaff: boolean }) {
  const t = useTranslations('settings.security.mfa');
  const tc = useTranslations('common');
  const f = useFormatter();
  const router = useRouter();
  const errorText = useErrorText();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const [busy, start] = useTransition();

  if (factors.length) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-success" aria-hidden />
          <span className="font-medium text-text">{t('enabled')}</span>
          <Badge tone="success">{tc('on')}</Badge>
          <span className="text-sm text-text-2">{f.dateTime(new Date(factors[0]!.createdAt), 'short')}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setConfirmOff(factors[0]!.id)} disabled={aal !== 'aal2'}>
          {t('disable')}
        </Button>
        {isStaff ? <p className="w-full text-sm text-text-2">{t('staffNote')}</p> : null}
        <ConfirmDialog
          open={confirmOff !== null}
          onOpenChange={(v) => !v && setConfirmOff(null)}
          title={t('disableTitle')}
          description={t('disableText')}
          confirmLabel={t('disable')}
          cancelLabel={tc('cancel')}
          closeLabel={tc('close')}
          pending={busy}
          onConfirm={() =>
            start(async () => {
              const r = await mfaUnenrollAction(confirmOff!);
              setConfirmOff(null);
              if (r.ok) {
                toast.success(t('disabled'));
                router.refresh();
              } else toast.error(errorText(r.error));
            })
          }
        />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge>{tc('off')}</Badge>
          {isStaff ? <span className="text-sm text-text-2">{t('staffNote')}</span> : null}
        </div>
        <Button
          loading={busy}
          onClick={() =>
            start(async () => {
              const r = await mfaEnrollAction();
              if ('factorId' in r) setEnrollment(r);
              else toast.error(errorText(r.code));
            })
          }
        >
          {t('setup')}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enrollment.qrDataUrl} alt={t('qrAlt')} width={180} height={180} className="rounded-md border border-border bg-white" />
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await mfaVerifyEnrollAction(enrollment.factorId, code);
            if (r.ok) {
              toast.success(t('enabled'));
              setEnrollment(null);
              router.refresh();
            } else setError(r.error ?? 'generic');
          });
        }}
      >
        <p className="text-sm text-text">{t('scan')}</p>
        <p className="break-all text-xs text-text-2">
          {t('manual')} <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-text">{enrollment.secret}</code>
        </p>
        <Field label={t('code')} htmlFor="mfa-code" error={error ? errorText(error) : undefined}>
          <Input
            id="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            className="max-w-40 text-center tracking-[0.3em]"
            required
          />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" loading={busy}>
            {t('verify')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEnrollment(null)}>
            {tc('cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
