import { buttonClass } from '@hub/ui';
import { Check, CircleDot } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { finishOnboardingAction } from '@/app/actions/company';
import { AuthShell } from '@/components/auth-shell';
import { canManage, requireUser } from '@/lib/session';
import { CompanyForm, InviteStep } from './steps';

export const metadata: Metadata = { title: 'Set up' };

type Step = 'company' | 'team' | 'done';

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; new?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireUser('/onboarding');
  const t = await getTranslations('onboarding');
  const wantsNew = sp.new === '1';
  let step: Step = sp.step === 'team' ? 'team' : sp.step === 'done' ? 'done' : 'company';
  if (step === 'company' && ctx.company && !wantsNew) redirect('/home');
  if (step !== 'company' && !ctx.company) step = 'company';
  if (step === 'team' && !canManage(ctx.role)) step = 'done';

  const steps: { id: Step; label: string }[] = [
    { id: 'company', label: t('steps.company') },
    { id: 'team', label: t('steps.team') },
    { id: 'done', label: t('steps.done') },
  ];
  const index = steps.findIndex((s) => s.id === step);

  return (
    <AuthShell title={t('title')} wide>
      <ol className="mb-6 flex items-center gap-2 text-sm" aria-label={t('title')}>
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={
                i < index
                  ? 'flex size-6 items-center justify-center rounded-full bg-success-tint text-success'
                  : i === index
                    ? 'flex size-6 items-center justify-center rounded-full bg-accent-tint text-accent-strong'
                    : 'flex size-6 items-center justify-center rounded-full bg-surface-2 text-text-3'
              }
              aria-current={i === index ? 'step' : undefined}
            >
              {i < index ? <Check className="size-3.5" aria-hidden /> : <CircleDot className="size-3.5" aria-hidden />}
            </span>
            <span className={i === index ? 'font-medium text-text' : 'text-text-2'}>{s.label}</span>
            {i < steps.length - 1 ? <span className="mx-1 h-px w-6 bg-border" aria-hidden /> : null}
          </li>
        ))}
      </ol>

      {step === 'company' ? (
        <>
          <h2 className="mb-4 text-lg font-semibold">{t('company.heading')}</h2>
          <CompanyForm locale={await getLocale()} />
        </>
      ) : step === 'team' ? (
        <>
          <h2 className="text-lg font-semibold">{t('team.heading')}</h2>
          <p className="mb-4 mt-1 text-base text-text-2">{t('team.text')}</p>
          <InviteStep />
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold">{t('done.heading', { company: ctx.company?.name ?? '' })}</h2>
          <p className="mt-1 text-base text-text-2">{t('done.text')}</p>
          <ul className="mt-4 space-y-2 text-base text-text">
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              {t('done.next1')}
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              {t('done.next2')}
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              {t('done.next3')}
            </li>
          </ul>
          <form action={finishOnboardingAction} className="mt-6">
            <button type="submit" className={buttonClass('primary', 'md', 'w-full sm:w-auto')}>
              {t('done.go')}
            </button>
          </form>
        </>
      )}
      {step === 'company' && ctx.company ? (
        <p className="mt-6 text-sm">
          <Link href="/home" className="text-text-2 hover:text-text">
            {t('backHome')}
          </Link>
        </p>
      ) : null}
    </AuthShell>
  );
}
