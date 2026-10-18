import { Card, CardHeader } from '@hub/ui';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { canManage, requireCompany } from '@/lib/session';
import { CompanySettingsForm } from './company-form';

export const metadata: Metadata = { title: 'Company' };

export default async function CompanySettingsPage() {
  const ctx = await requireCompany('/settings/company');
  const t = await getTranslations('settings');
  const editable = canManage(ctx.role);
  return (
    <Card>
      <CardHeader title={t('company.title')} description={editable ? undefined : t('company.readonly')} />
      <div className="p-4">
        <CompanySettingsForm
          editable={editable}
          name={ctx.company.name}
          type={ctx.company.type}
          locale={ctx.company.locale}
          timezone={ctx.company.timezone}
        />
      </div>
    </Card>
  );
}
