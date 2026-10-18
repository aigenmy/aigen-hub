import { Badge, buttonClass, Card, CardHeader, KpiTile } from '@hub/ui';
import { CheckCircle2, Circle, ShieldCheck, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { PageBody, PageHeader } from '@/components/app-shell';
import { auth } from '@/lib/auth';
import { asUser } from '@/lib/db';
import { openInvitations, seatsUsed } from '@/lib/queries';
import { canManage, requireCompany } from '@/lib/session';

export const metadata: Metadata = { title: 'Home' };

function hourIn(timeZone: string) {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone }).format(new Date()));
}

export default async function HomePage() {
  const ctx = await requireCompany('/home');
  const t = await getTranslations('home');
  const tc = await getTranslations('common');
  const f = await getFormatter();
  const company = ctx.company;

  const [used, invites, factors] = await Promise.all([
    asUser(ctx.claims, (tx) => seatsUsed(tx, company.id)),
    canManage(ctx.role) ? asUser(ctx.claims, (tx) => openInvitations(tx, company.id)) : Promise.resolve([]),
    auth().mfa.list(),
  ]);

  const hour = hourIn(ctx.profile.timezone);
  const name = ctx.profile.fullName.split(' ')[0] || ctx.profile.email;
  const greeting = hour < 12 ? t('greeting.morning', { name }) : hour < 18 ? t('greeting.afternoon', { name }) : t('greeting.evening', { name });
  const plan = tc(`plans.${company.planId}` as 'plans.free');

  const steps = [
    { done: true, label: t('setup.company'), href: '/settings/company' },
    { done: used > 1 || invites.length > 0, label: t('setup.invite'), href: '/team' },
    { done: factors.some((x) => x.status === 'verified'), label: t('setup.mfa'), href: '/settings/security' },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <PageHeader
        title={greeting}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {t('subtitle', { company: company.name, plan })}
            {company.isFounder ? <Badge tone="accent">{tc('founder')}</Badge> : null}
            {company.isInternal ? <Badge>{tc('internal')}</Badge> : null}
          </span>
        }
      />
      <PageBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiTile
            label={t('tiles.team')}
            value={t('tiles.teamValue', { used, limit: company.seatsLimit })}
            hint={canManage(ctx.role) && invites.length ? t('tiles.invites', { count: invites.length }) : undefined}
            icon={<Users className="size-4" aria-hidden />}
          />
          <KpiTile label={t('tiles.plan')} value={plan} hint={t('tiles.planHint')} />
          <KpiTile
            label={t('tiles.role')}
            value={tc(`roles.${ctx.role}`)}
            hint={ctx.joinedAt ? t('tiles.since', { date: f.dateTime(ctx.joinedAt, 'short') }) : undefined}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {doneCount < steps.length ? (
            <Card>
              <CardHeader title={t('setup.title')} description={t('setup.progress', { done: doneCount, total: steps.length })} />
              <ul className="divide-y divide-border">
                {steps.map((s) => (
                  <li key={s.label} className="flex items-center gap-3 px-4 py-3">
                    {s.done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
                    ) : (
                      <Circle className="size-5 shrink-0 text-text-3" aria-hidden />
                    )}
                    <span className={s.done ? 'flex-1 text-text-2 line-through decoration-text-3' : 'flex-1 text-text'}>{s.label}</span>
                    {!s.done ? (
                      <Link href={s.href} className={buttonClass('secondary', 'sm')}>
                        {t('setup.doIt')}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t('next.title')} description={t('next.text')} />
            <ul className="space-y-2 px-4 py-3 text-base">
              {(['inbox', 'assistant', 'meta'] as const).map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {t(`next.${k}`)}
                </li>
              ))}
            </ul>
          </Card>

          {ctx.profile.isStaff ? (
            <Card className="flex items-center justify-between gap-3 p-4">
              <span className="flex items-center gap-2 text-base text-text">
                <ShieldCheck className="size-5 text-accent-strong" aria-hidden />
                {t('staff')}
              </span>
              <Link href="/console" className={buttonClass('secondary', 'sm')}>
                {tc('nav.console')}
              </Link>
            </Card>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
