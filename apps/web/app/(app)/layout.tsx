import { touchLastActive } from '@/app/actions/company';
import { AppShell } from '@/components/app-shell';
import { currentPath } from '@/lib/path';
import { requireCompany } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCompany(await currentPath());
  await touchLastActive();
  return <AppShell ctx={ctx}>{children}</AppShell>;
}
