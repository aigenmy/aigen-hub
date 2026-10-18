import { schema } from '@hub/db';
import { Card, CardHeader, WarningBox } from '@hub/ui';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { asUser } from '@/lib/db';
import { isLocalMode } from '@/lib/env';
import { canManage, requireCompany } from '@/lib/session';
import { MfaSection } from './mfa-section';
import { PasswordForm } from './password-form';

export const metadata: Metadata = { title: 'Security' };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ staff?: string }> }) {
  const ctx = await requireCompany('/settings/security');
  const t = await getTranslations('settings');
  const f = await getFormatter();
  const staffPrompt = (await searchParams).staff === '1' && ctx.profile.isStaff;
  const factors = (await auth().mfa.list()).filter((x) => x.status === 'verified');
  const staffVisits = canManage(ctx.role)
    ? await asUser(ctx.claims, (tx) =>
        tx
          .select({ id: schema.auditLog.id, action: schema.auditLog.action, createdAt: schema.auditLog.createdAt })
          .from(schema.auditLog)
          .where(and(eq(schema.auditLog.companyId, ctx.company.id), isNotNull(schema.auditLog.impersonatingUserId)))
          .orderBy(desc(schema.auditLog.createdAt))
          .limit(20),
      )
    : [];

  return (
    <>
      {staffPrompt ? (
        <WarningBox title={t('security.mfa.staffTitle')}>{t('security.mfa.staffNote')}</WarningBox>
      ) : null}
      <Card>
        <CardHeader title={t('security.mfa.title')} description={t('security.mfa.text')} />
        <div className="p-4">
          <MfaSection
            factors={factors.map((x) => ({ id: x.id, createdAt: x.createdAt }))}
            aal={ctx.aal}
            isStaff={ctx.profile.isStaff}
          />
        </div>
      </Card>
      <Card>
        <CardHeader title={t('security.password.title')} description={isLocalMode() ? undefined : t('security.password.text')} />
        <div className="p-4">
          <PasswordForm />
        </div>
      </Card>
      {canManage(ctx.role) ? (
        <Card>
          <CardHeader title={t('security.staffAccess.title')} description={t('security.staffAccess.text')} />
          <div className="p-4 text-sm text-text-2">
            {staffVisits.length ? (
              <ul className="space-y-1">
                {staffVisits.map((v) => (
                  <li key={v.id}>
                    {f.dateTime(v.createdAt, 'long')} · {v.action}
                  </li>
                ))}
              </ul>
            ) : (
              t('security.staffAccess.none')
            )}
          </div>
        </Card>
      ) : null}
    </>
  );
}
