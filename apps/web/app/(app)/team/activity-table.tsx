'use client';
import { Avatar, EmptyState, Select, Table, TD, TH } from '@hub/ui';
import { History } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type Json = Record<string, unknown> | null;
type Row = {
  id: number;
  action: string;
  actorType: 'user' | 'ai' | 'system' | 'staff';
  actorId: string | null;
  objectType: string;
  objectId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  actorName: string | null;
};

const CATEGORY: Record<string, 'members' | 'invitations' | 'settings'> = {
  company_members: 'members',
  invitations: 'invitations',
  companies: 'settings',
  company_modules: 'settings',
  company_flags: 'settings',
};

/** The company's activity log in plain words (spec §4.5: members see the audit log as "Activity"). */
export function ActivityTable({ rows, names, companyName }: { rows: Row[]; names: Record<string, string>; companyName: string }) {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const f = useFormatter();
  const [filter, setFilter] = useState<'all' | 'members' | 'invitations' | 'settings'>('all');

  const visible = useMemo(() => rows.filter((r) => filter === 'all' || CATEGORY[r.objectType] === filter), [rows, filter]);

  const who = (r: Row) =>
    r.actorType === 'staff'
      ? t('activity.staff')
      : r.actorType === 'system'
        ? t('activity.system')
        : r.actorType === 'ai'
          ? t('activity.ai')
          : (r.actorId && names[r.actorId]) || r.actorName || t('activity.formerMember');

  const moduleName = (id: unknown) => {
    const key = `modules.${String(id ?? '').replace(/\./g, '_')}` as 'modules.home';
    return tc.has(key) ? tc(key) : String(id ?? '');
  };

  const describe = (r: Row): string => {
    const before = r.before as Json;
    const after = r.after as Json;
    const target = (r.objectId && names[r.objectId]) || r.objectId || '';
    const role = (v: unknown) => (typeof v === 'string' && ['owner', 'admin', 'agent', 'viewer'].includes(v) ? tc(`roles.${v as 'owner'}`) : '');
    switch (r.action) {
      case 'companies.insert':
        return t('audit.companyCreated', { company: companyName });
      case 'companies.update': {
        const changed = Object.keys(after ?? {}).filter(
          (k) => k !== 'updated_at' && JSON.stringify(after?.[k]) !== JSON.stringify(before?.[k]),
        );
        if (changed.length === 1 && changed[0] === 'onboarding') return t('audit.setupFinished');
        const label = (k: string) => {
          const key = `audit.fields.${k}` as 'audit.fields.name';
          return t.has(key) ? t(key) : k;
        };
        return t('audit.companyChanged', { fields: changed.filter((k) => k !== 'onboarding').map(label).join(', ') });
      }
      case 'company_members.insert':
        return t('audit.memberAdded', { target, role: role(after?.role) });
      case 'company_members.update':
        if (before?.role !== after?.role) return t('audit.roleChanged', { target, role: role(after?.role) });
        if (after?.status === 'suspended') return t('audit.memberSuspended', { target });
        return t('audit.memberRestored', { target });
      case 'company_members.delete':
        return r.actorId && r.actorId === r.objectId ? t('audit.memberLeft') : t('audit.memberRemoved', { target });
      case 'invitations.insert':
        return t('audit.invited', { email: String(after?.email ?? ''), role: role(after?.role) });
      case 'invitations.update':
        if (!before?.accepted_at && after?.accepted_at) return t('audit.inviteAccepted', { email: String(after?.email ?? '') });
        if (!before?.revoked_at && after?.revoked_at) return t('audit.inviteRevoked', { email: String(after?.email ?? '') });
        return t('audit.inviteChanged', { email: String(after?.email ?? '') });
      case 'company_modules.insert':
      case 'company_modules.update':
        return t('audit.moduleSet', { module: moduleName(after?.module_id), state: after?.state === 'on' ? tc('on') : tc('off') });
      case 'company_modules.delete':
        return t('audit.moduleReset', { module: moduleName(before?.module_id) });
      default:
        return r.action;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <Select aria-label={t('activity.filter')} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-8 w-48 text-sm">
          <option value="all">{t('activity.filterAll')}</option>
          <option value="members">{t('activity.filterMembers')}</option>
          <option value="invitations">{t('activity.filterInvitations')}</option>
          <option value="settings">{t('activity.filterSettings')}</option>
        </Select>
        <span className="text-xs text-text-2">{t('activity.count', { count: visible.length })}</span>
      </div>
      {visible.length ? (
        <Table>
          <thead>
            <tr>
              <TH className="w-44">{t('activity.when')}</TH>
              <TH className="w-48">{t('activity.who')}</TH>
              <TH>{t('activity.what')}</TH>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <TD className="whitespace-nowrap text-sm text-text-2">{f.dateTime(new Date(r.createdAt), 'long')}</TD>
                <TD>
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={who(r)} size={22} />
                    <span className="truncate text-sm">{who(r)}</span>
                  </span>
                </TD>
                <TD className="text-sm">{describe(r)}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState icon={<History className="size-5" aria-hidden />} text={t('activity.empty')} />
      )}
    </div>
  );
}
