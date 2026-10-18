import { Card, CardHeader } from '@hub/ui';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireCompany } from '@/lib/session';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const ctx = await requireCompany('/settings/profile');
  const t = await getTranslations('settings');
  return (
    <Card>
      <CardHeader title={t('profile.title')} />
      <div className="p-4">
        <ProfileForm
          fullName={ctx.profile.fullName}
          email={ctx.profile.email}
          locale={ctx.profile.locale}
          timezone={ctx.profile.timezone}
        />
      </div>
    </Card>
  );
}
