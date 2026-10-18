'use client';
import { Avatar, Badge, cn, HubMark, IconButton } from '@hub/ui';
import { Check, ChevronsUpDown, LogOut, Menu, Plus, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DropdownMenu, Dialog as RDialog } from 'radix-ui';
import { useState, useTransition } from 'react';
import { signOutAction } from '@/app/actions/auth';
import { switchCompanyAction } from '@/app/actions/company';
import { ModuleIcon } from './icons';
import { LanguageSwitcher } from './language-switcher';

export type NavItem = { href: string; icon: string; label: string };

type Props = {
  items: NavItem[];
  staffLink: NavItem | null;
  company: { id: string; name: string; plan: string } | null;
  companies: { id: string; name: string; role: string }[];
  user: { name: string; email: string; avatarUrl: string | null };
};

const menuItem =
  'flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-base text-text outline-none data-[highlighted]:bg-surface-2';

function CompanySwitcher({ company, companies }: Pick<Props, 'company' | 'companies'>) {
  const t = useTranslations('common');
  const [pending, start] = useTransition();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-left hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={t('nav.switchCompany')}
          disabled={pending}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-medium text-text">{company?.name ?? '—'}</span>
            {company ? <span className="block truncate text-xs text-text-2">{company.plan}</span> : null}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-text-3" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-md border border-border bg-surface p-1 shadow-pop"
        >
          <DropdownMenu.Label className="px-2 py-1 text-xs font-medium text-text-2">{t('nav.switchCompany')}</DropdownMenu.Label>
          {companies.map((c) => (
            <DropdownMenu.Item
              key={c.id}
              className={menuItem}
              onSelect={() => {
                if (c.id !== company?.id) start(() => switchCompanyAction(c.id));
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{c.name}</span>
                <span className="block text-xs text-text-2">{c.role}</span>
              </span>
              {c.id === company?.id ? <Check className="size-4 text-accent-strong" aria-hidden /> : null}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={menuItem}>
            <Link href="/onboarding?new=1">
              <Plus className="size-4 text-text-2" aria-hidden />
              {t('nav.newCompany')}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function NavLinks({ items, staffLink, onNavigate }: Pick<Props, 'items' | 'staffLink'> & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const link = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-base transition-colors',
            active ? 'bg-accent-tint font-medium text-accent-strong' : 'text-text-2 hover:bg-surface-2 hover:text-text',
          )}
        >
          <ModuleIcon name={item.icon} />
          {item.label}
        </Link>
      </li>
    );
  };
  return (
    <nav className="flex-1">
      <ul className="space-y-0.5">{items.map(link)}</ul>
      {staffLink ? <ul className="mt-4 border-t border-border pt-4">{link(staffLink)}</ul> : null}
    </nav>
  );
}

function UserMenu({ user }: Pick<Props, 'user'>) {
  const t = useTranslations('common');
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={t('nav.account')}
        >
          <Avatar name={user.name} src={user.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">{user.name}</span>
            <span className="block truncate text-xs text-text-2">{user.email}</span>
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="top" align="start" sideOffset={6} className="z-50 w-56 rounded-md border border-border bg-surface p-1 shadow-pop">
          <DropdownMenu.Item asChild className={menuItem}>
            <Link href="/settings/profile">
              <Settings className="size-4 text-text-2" aria-hidden />
              {t('nav.settings')}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={menuItem} onSelect={() => void signOutAction()}>
            <LogOut className="size-4 text-text-2" aria-hidden />
            {t('signOut')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Panel(props: Props & { onNavigate?: () => void }) {
  const t = useTranslations('common');
  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="flex items-center gap-2 px-1 pt-1">
        <HubMark size={26} />
        <span className="text-md font-semibold tracking-tight text-text">{t('appName')}</span>
        <Badge tone="accent">{t('beta')}</Badge>
      </div>
      <CompanySwitcher company={props.company} companies={props.companies} />
      <NavLinks items={props.items} staffLink={props.staffLink} onNavigate={props.onNavigate} />
      <div className="space-y-1 border-t border-border pt-3">
        <div className="px-1">
          <LanguageSwitcher />
        </div>
        <UserMenu user={props.user} />
      </div>
    </div>
  );
}

export function Sidebar(props: Props) {
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-surface md:block">
        <Panel {...props} />
      </aside>
      <div className="glass sticky top-0 z-30 flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
        <RDialog.Root open={open} onOpenChange={setOpen}>
          <RDialog.Trigger asChild>
            <IconButton label={t('nav.menu')} className="text-text">
              <Menu className="size-6" aria-hidden />
            </IconButton>
          </RDialog.Trigger>
          <RDialog.Portal>
            <RDialog.Overlay className="fixed inset-0 z-40 bg-[rgb(15_23_42/0.35)]" />
            <RDialog.Content className="fixed inset-y-0 left-0 z-50 w-[86vw] max-w-72 bg-surface shadow-pop focus:outline-none">
              <RDialog.Title className="sr-only">{t('nav.menu')}</RDialog.Title>
              <RDialog.Description className="sr-only">{t('nav.menu')}</RDialog.Description>
              <RDialog.Close asChild>
                <IconButton label={t('close')} className="absolute right-2 top-2">
                  <X className="size-4" aria-hidden />
                </IconButton>
              </RDialog.Close>
              <Panel {...props} onNavigate={() => setOpen(false)} />
            </RDialog.Content>
          </RDialog.Portal>
        </RDialog.Root>
        <HubMark size={24} />
        <span className="min-w-0 flex-1 truncate text-base font-medium text-text">{props.company?.name ?? t('appName')}</span>
      </div>
    </>
  );
}
