'use client';
import type { MemberRole } from '@hub/db/schema';
import { ConfirmDialog, EmptyState, IconButton, Table, TD, TH, toast } from '@hub/ui';
import { MailPlus, XCircle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { revokeInvitationAction } from '@/app/actions/team';
import { useErrorText } from '@/components/forms';

type Row = { id: string; email: string; role: MemberRole; expiresAt: string; createdAt: string; invitedByName: string | null };

export function InvitationsTable({ rows, myRole }: { rows: Row[]; myRole: MemberRole }) {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const f = useFormatter();
  const errorText = useErrorText();
  const [target, setTarget] = useState<Row | null>(null);
  const [busy, start] = useTransition();

  if (!rows.length) return <EmptyState icon={<MailPlus className="size-5" aria-hidden />} text={t('invitations.empty')} />;

  return (
    <>
      <Table>
        <thead>
          <tr>
            <TH>{t('invitations.email')}</TH>
            <TH>{t('invitations.role')}</TH>
            <TH className="hidden sm:table-cell">{t('invitations.invitedBy')}</TH>
            <TH className="hidden sm:table-cell">{t('invitations.expires')}</TH>
            <TH className="w-16 text-right">
              <span className="sr-only">{t('table.actions')}</span>
            </TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <TD className="font-medium">{r.email}</TD>
              <TD>{tc(`roles.${r.role}`)}</TD>
              <TD className="hidden text-sm text-text-2 sm:table-cell">{r.invitedByName ?? '—'}</TD>
              <TD className="hidden text-sm text-text-2 sm:table-cell">{f.relativeTime(new Date(r.expiresAt))}</TD>
              <TD className="text-right">
                {myRole === 'owner' || r.role !== 'admin' ? (
                  <IconButton label={t('invitations.revoke')} size="sm" onClick={() => setTarget(r)}>
                    <XCircle className="size-4 text-danger" aria-hidden />
                  </IconButton>
                ) : null}
              </TD>
            </tr>
          ))}
        </tbody>
      </Table>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(v) => !v && setTarget(null)}
        title={t('invitations.revokeTitle', { email: target?.email ?? '' })}
        description={t('invitations.revokeText')}
        confirmLabel={t('invitations.revoke')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        pending={busy}
        onConfirm={() =>
          start(async () => {
            if (!target) return;
            const r = await revokeInvitationAction(target.id);
            if (r.ok) toast.success(t('toast.revoked'));
            else toast.error(errorText(r.error));
            setTarget(null);
          })
        }
      />
    </>
  );
}
