import { cn } from '@hub/ui';
import Link from 'next/link';

/** Tabs that are links (each tab has its own URL, so it can be bookmarked and shared). */
export function LinkTabs({ tabs, active, label }: { tabs: { id: string; href: string; label: React.ReactNode }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-4 sm:px-6">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? 'page' : undefined}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-base transition-colors',
            tab.id === active ? 'border-accent-strong font-medium text-text' : 'border-transparent text-text-2 hover:text-text',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
