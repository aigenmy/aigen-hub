'use client';
import { cn } from '@hub/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Tabs for sub-pages; the active one follows the URL. */
export function PathTabs({ tabs, label }: { tabs: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href;
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-4 sm:px-6">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? 'page' : undefined}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-base transition-colors',
            tab.href === active ? 'border-accent-strong font-medium text-text' : 'border-transparent text-text-2 hover:text-text',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
