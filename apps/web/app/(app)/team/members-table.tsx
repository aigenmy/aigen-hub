'use client';
import type { MemberRole } from '@hub/db/schema';
import { Avatar, Badge, ConfirmDialog, IconButton, Select, Table, TD, TH, toast } from '@hub/ui';
import { LogOut, PauseCircle, PlayCircle, UserMinus } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { changeRoleAction, removeMemberAction, setStatusAction } from '@/app/actions/team';
import { useErrorText } from '@/components/forms';

type Row = {
  userId: string;
  role: MemberRole;
  status: 'active' | 'suspended';
  takesSeat: boolean;
  joinedAt: string;
  lastActiveAt: string | null;
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

type Pending = { kind: 'remove' | 'suspend' | 'leave'; row: Row } | null;

/** Mirrors the database rules (spec §4.3) so the screen offers only what will succeed. */
function canManageRow(myRole: MemberRole, me: string, row: Row) {
  if (row.userId === me || row.role === 'owner') return false;
  if (myRole === 'owner') return true;
  if (myRole === 'admin') return row.role === 'agent' || row.role === 'viewer';
  return false;
}

export function MembersTable({ rows, me, myRole, company }: { rows: Row[]; me: string; myRole: MemberRole; company: string }) {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const f = useFormatter();
  const errorText = useErrorText();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(success);
      else toast.error(errorText(r.error));
      setPending(null);
    });

  const roleOptions: MemberRole[] = myRole === 'owner' ? ['admin', 'agent', 'viewer'] : ['agent', 'viewer'];
  const name = (r: Row) => r.fullName || r.email;

  return (
    <>
      <Table>
        <thead>
          <tr>
            <TH>{t('table.name')}</TH>
            <TH className="w-36">{t('table.role')}</TH>
            <TH className="hidden sm:table-cell">{t('table.seat')}</TH>
            <TH className="hidden md:table-cell">{t('table.joined')}</TH>
            <TH className="hidden lg:table-cell">{t('table.lastActive')}</TH>
            <TH className="w-28 text-right">
              <span className="sr-only">{t('table.actions')}</span>
            </TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const manageable = canManageRow(myRole, me, r);
            return (
              <tr key={r.userId} className={r.status === 'suspended' ? 'bg-surface-2' : undefined}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={name(r)} src={r.avatarUrl} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium text-text">
                        <span className="truncate">{name(r)}</span>
                        {r.userId === me ? <Badge>{t('table.you')}</Badge> : null}
                        {r.status === 'suspended' ? <Badge tone="warning">{t('status.suspended')}</Badge> : null}
                      </div>
                      <div className="truncate text-sm text-text-2">{r.email}</div>
                    </div>
                  </div>
                </TD>
                <TD>
                  {manageable ? (
                    <Select
                      aria-label={t('actions.changeRole')}
                      value={r.role}
                      disabled={busy}
                      className="h-8 min-w-28 text-sm"
                      onChange={(e) => {
                        const role = e.target.value as MemberRole;
                        run(() => changeRoleAction(r.userId, role), t('toast.roleChanged'));
                      }}
                    >
                      {roleOptions.map((o) => (
                        <option key={o} value={o}>
                          {tc(`roles.${o}`)}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="text-text">{tc(`roles.${r.role}`)}</span>
                  )}
                </TD>
                <TD className="hidden text-sm text-text-2 sm:table-cell">{r.takesSeat ? t('table.seatYes') : t('table.seatNo')}</TD>
                <TD className="hidden text-sm text-text-2 md:table-cell">{f.dateTime(new Date(r.joinedAt), 'short')}</TD>
                <TD className="hidden text-sm text-text-2 lg:table-cell">
                  {r.lastActiveAt ? f.relativeTime(new Date(r.lastActiveAt)) : tc('time.never')}
                </TD>
                <TD className="text-right">
                  <div className="inline-flex gap-0.5">
                    {manageable ? (
                      <>
                        {r.status === 'active' ? (
                          <IconButton label={t('actions.suspend')} size="sm" disabled={busy} onClick={() => setPending({ kind: 'suspend', row: r })}>
                            <PauseCircle className="size-4" aria-hidden />
                          </IconButton>
                        ) : (
                          <IconButton
                            label={t('actions.restore')}
                            size="sm"
                            disabled={busy}
                            onClick={() => run(() => setStatusAction(r.userId, 'active'), t('toast.restored'))}
                          >
                            <PlayCircle className="size-4" aria-hidden />
                          </IconButton>
                        )}
                        <IconButton label={t('actions.remove')} size="sm" disabled={busy} onClick={() => setPending({ kind: 'remove', row: r })}>
                          <UserMinus className="size-4 text-danger" aria-hidden />
                        </IconButton>
                      </>
                    ) : r.userId === me && r.role !== 'owner' ? (
                      <IconButton label={t('actions.leave')} size="sm" disabled={busy} onClick={() => setPending({ kind: 'leave', row: r })}>
                        <LogOut className="size-4" aria-hidden />
                      </IconButton>
                    ) : null}
                  </div>
                </TD>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(v) => !v && setPending(null)}
        title={
          pending?.kind === 'remove'
            ? t('confirm.removeTitle', { name: pending ? name(pending.row) : '' })
            : pending?.kind === 'suspend'
              ? t('confirm.suspendTitle', { name: pending ? name(pending.row) : '' })
              : t('confirm.leaveTitle', { company })
        }
        description={
          pending?.kind === 'remove'
            ? t('confirm.removeText', { name: name(pending.row), company })
            : pending?.kind === 'suspend'
              ? t('confirm.suspendText', { name: name(pending.row), company })
              : t('confirm.leaveText')
        }
        confirmLabel={pending?.kind === 'remove' ? t('actions.remove') : pending?.kind === 'suspend' ? t('actions.suspend') : t('actions.leave')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        pending={busy}
        onConfirm={() => {
          if (!pending) return;
          const r = pending.row;
          if (pending.kind === 'suspend') run(() => setStatusAction(r.userId, 'suspended'), t('toast.suspended'));
          else run(() => removeMemberAction(r.userId), t('toast.removed'));
        }}
      />
    </>
  );
}
