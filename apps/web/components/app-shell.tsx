import { navFor } from '@hub/modules';
import { getTranslations } from 'next-intl/server';
import type { AppContext } from '@/lib/session';
import { Sidebar, type NavItem } from './sidebar';

export const moduleKey = (id: string) => id.replace(/\./g, '_');

export async function AppShell({ ctx, children }: { ctx: AppContext; children: React.ReactNode }) {
  const t = await getTranslations('common');
  const items: NavItem[] = ctx.role
    ? navFor(ctx.entitlements, ctx.role).map((m) => ({
        href: m.route!,
        icon: m.icon,
        label: t(`modules.${moduleKey(m.id)}` as 'modules.home'),
      }))
    : [];
  return (
    <div className="min-h-dvh md:flex">
      <Sidebar
        items={items}
        staffLink={ctx.profile.isStaff ? { href: '/console', icon: 'ShieldCheck', label: t('nav.console') } : null}
        company={ctx.company ? { id: ctx.company.id, name: ctx.company.name, plan: t(`plans.${ctx.company.planId}` as 'plans.free') } : null}
        companies={ctx.memberships.map((m) => ({ id: m.companyId, name: m.name, role: t(`roles.${m.role}`) }))}
        user={{ name: ctx.profile.fullName || ctx.profile.email, email: ctx.profile.email, avatarUrl: ctx.profile.avatarUrl }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Title row at the top of every app page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-5 sm:px-6 md:pt-7">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        {description ? <p className="mt-1 text-base text-text-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 pb-10 sm:px-6 ${className ?? ''}`}>{children}</div>;
}
