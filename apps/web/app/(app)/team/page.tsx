import { Badge, Card, HelpTip } from '@hub/ui';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageBody, PageHeader } from '@/components/app-shell';
import { LinkTabs } from '@/components/link-tabs';
import { asUser } from '@/lib/db';
import { activity, members, openInvitations } from '@/lib/queries';
import { canManage, requireCompany } from '@/lib/session';
import { ActivityTable } from './activity-table';
import { InvitationsTable } from './invitations-table';
import { InviteButton } from './invite-button';
import { MembersTable } from './members-table';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireCompany('/team');
  const t = await getTranslations('team');
  const manager = canManage(ctx.role);
  const requested = (await searchParams).tab;
  const tab = manager && (requested === 'invitations' || requested === 'activity') ? requested : 'members';

  const [rows, invites, events] = await asUser(ctx.claims, async (tx) =>
    Promise.all([
      members(tx, ctx.company.id),
      manager ? openInvitations(tx, ctx.company.id) : Promise.resolve([]),
      manager && tab === 'activity' ? activity(tx, ctx.company.id) : Promise.resolve([]),
    ]),
  );
  const used = rows.filter((r) => r.takesSeat).length;

  const tabs: { id: string; href: string; label: React.ReactNode }[] = [{ id: 'members', href: '/team', label: t('tabs.members') }];
  if (manager) {
    tabs.push(
      {
        id: 'invitations',
        href: '/team?tab=invitations',
        label: (
          <span className="inline-flex items-center gap-1.5">
            {t('tabs.invitations')}
            {invites.length ? <Badge tone="accent">{invites.length}</Badge> : null}
          </span>
        ),
      },
      { id: 'activity', href: '/team?tab=activity', label: t('tabs.activity') },
    );
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={
          <span className="inline-flex items-center gap-1.5">
            {t('seats', { used, limit: ctx.company.seatsLimit })}
            <HelpTip label={t('seatsHelpLabel')}>{t('seatsHelp')}</HelpTip>
          </span>
        }
        actions={manager ? <InviteButton allowAdmin={ctx.role === 'owner'} /> : null}
      />
      <LinkTabs tabs={tabs} active={tab} label={t('title')} />
      <PageBody className="pt-4">
        <Card>
          {tab === 'members' ? (
            <MembersTable
              rows={rows.map((r) => ({ ...r, joinedAt: r.joinedAt.toISOString(), lastActiveAt: r.lastActiveAt?.toISOString() ?? null }))}
              me={ctx.userId}
              myRole={ctx.role}
              company={ctx.company.name}
            />
          ) : tab === 'invitations' ? (
            <InvitationsTable
              rows={invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString(), createdAt: i.createdAt.toISOString() }))}
              myRole={ctx.role}
            />
          ) : (
            <ActivityTable
              rows={events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
              names={Object.fromEntries(rows.map((r) => [r.userId, r.fullName || r.email]))}
              companyName={ctx.company.name}
            />
          )}
        </Card>
        {!manager ? <p className="mt-3 text-sm text-text-2">{t('readonly')}</p> : null}
      </PageBody>
    </>
  );
}
