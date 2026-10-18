// The module registry (spec §2.1). Code-level facts live here (section, route, icon, phase, built);
// commercial facts live in the database (modules / plan_modules / company_modules, edited in the Console).
// The app menu shows a module only when it is built AND the company is entitled to it AND the role may use it.

export type Section = 'home' | 'inbox' | 'ai' | 'content' | 'web' | 'business' | 'team' | 'settings' | 'console';
export type Role = 'owner' | 'admin' | 'agent' | 'viewer';

export type ModuleDef = {
  id: string;
  section: Section;
  /** App route; absent for channel modules that live inside another screen. */
  route?: string;
  /** lucide-react icon name, mapped to a component in the web app. */
  icon: string;
  /** Build phase from the plan (§11). */
  phase: number;
  /** True once the module's screens exist. Unbuilt modules never appear in the menu. */
  built: boolean;
  /** Always available to every company (cannot be switched off). */
  core?: boolean;
  staffOnly?: boolean;
  /** Roles that see it in the menu (default: everyone). */
  roles?: Role[];
};

export const MODULES: readonly ModuleDef[] = [
  { id: 'home', section: 'home', route: '/home', icon: 'LayoutDashboard', phase: 0, built: true, core: true },
  { id: 'inbox', section: 'inbox', route: '/inbox', icon: 'Inbox', phase: 1, built: false },
  { id: 'channel.webchat', section: 'inbox', icon: 'MessageCircle', phase: 1, built: false },
  { id: 'channel.telegram', section: 'inbox', icon: 'Send', phase: 1, built: false },
  { id: 'channel.whatsapp', section: 'inbox', icon: 'MessageSquare', phase: 1, built: false },
  { id: 'channel.instagram', section: 'inbox', icon: 'Instagram', phase: 3, built: false },
  { id: 'channel.messenger', section: 'inbox', icon: 'Facebook', phase: 3, built: false },
  { id: 'channel.email', section: 'inbox', icon: 'Mail', phase: 5, built: false },
  { id: 'channel.tiktok', section: 'inbox', icon: 'Music2', phase: 9, built: false },
  { id: 'channel.marketplace', section: 'inbox', icon: 'Store', phase: 9, built: false },
  { id: 'broadcast', section: 'inbox', route: '/broadcasts', icon: 'Megaphone', phase: 3, built: false },
  { id: 'automation', section: 'inbox', route: '/automation', icon: 'Workflow', phase: 1, built: false },
  { id: 'assistant', section: 'ai', route: '/assistant', icon: 'Sparkles', phase: 2, built: false },
  { id: 'knowledge', section: 'ai', route: '/knowledge', icon: 'BookOpen', phase: 2, built: false },
  { id: 'content', section: 'content', route: '/content', icon: 'CalendarDays', phase: 5, built: false },
  { id: 'email', section: 'web', route: '/email', icon: 'Mail', phase: 5, built: false },
  { id: 'website', section: 'web', route: '/website', icon: 'Globe', phase: 8, built: false },
  { id: 'company', section: 'business', route: '/company', icon: 'Building2', phase: 6, built: false },
  { id: 'contacts', section: 'business', route: '/contacts', icon: 'Contact', phase: 1, built: false },
  { id: 'deals', section: 'business', route: '/deals', icon: 'KanbanSquare', phase: 6, built: false },
  { id: 'invoicing', section: 'business', route: '/invoices', icon: 'ReceiptText', phase: 6, built: false },
  { id: 'reports', section: 'business', route: '/reports', icon: 'BarChart3', phase: 6, built: false },
  { id: 'team', section: 'team', route: '/team', icon: 'Users', phase: 0, built: true, core: true },
  { id: 'settings', section: 'settings', route: '/settings', icon: 'Settings', phase: 0, built: true, core: true },
  { id: 'console', section: 'console', route: '/console', icon: 'ShieldCheck', phase: 0, built: true, staffOnly: true },
] as const;

export const SECTION_ORDER: Section[] = ['home', 'inbox', 'ai', 'content', 'web', 'business', 'team', 'settings'];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);

/** Menu entries for one company and role, in menu order. `entitled` = module ids from the entitlement resolver. */
export function navFor(entitled: Iterable<string>, role: Role): ModuleDef[] {
  const set = new Set(entitled);
  return MODULES.filter(
    (m) =>
      m.built &&
      m.route &&
      !m.staffOnly &&
      (m.core || set.has(m.id)) &&
      (!m.roles || m.roles.includes(role)),
  ).sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));
}
