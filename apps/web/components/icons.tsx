import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Contact,
  Globe,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Mail,
  Megaphone,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

// Icons named in the module registry (@hub/modules).
const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Contact,
  Globe,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Mail,
  Megaphone,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
};

export function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className ?? 'size-4'} aria-hidden />;
}
