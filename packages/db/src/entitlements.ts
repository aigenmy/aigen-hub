// Which modules a company has, with their limits (spec §2.1, §8.1):
// the plan's modules, plus modules staff switched on for this company, minus modules switched off,
// minus modules AIGen disabled globally. Pure function so it is unit-tested; loadEntitlements reads the rows.
import { eq } from 'drizzle-orm';
import type { Tx } from './client';
import { companies, companyModules, modules, planModules } from './schema';

export type Limits = Record<string, unknown>;
export type Entitlements = Map<string, Limits>;

export function resolveEntitlements(input: {
  planModules: { moduleId: string; limits: Limits }[];
  overrides: { moduleId: string; state: 'on' | 'off'; trialUntil?: string | null }[];
  disabledModules: string[];
  today?: string; // YYYY-MM-DD, for trial overrides
}): Entitlements {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const out: Entitlements = new Map();
  for (const pm of input.planModules) out.set(pm.moduleId, pm.limits ?? {});
  for (const o of input.overrides) {
    const expired = o.trialUntil != null && o.trialUntil < today;
    if (o.state === 'on' && !expired) {
      if (!out.has(o.moduleId)) out.set(o.moduleId, {});
    } else if (o.state === 'off') {
      out.delete(o.moduleId);
    }
  }
  for (const id of input.disabledModules) out.delete(id);
  return out;
}

export async function loadEntitlements(tx: Tx, companyId: string): Promise<Entitlements> {
  const [company] = await tx.select({ planId: companies.planId }).from(companies).where(eq(companies.id, companyId));
  if (!company) return new Map();
  const [pm, ov, disabled] = await Promise.all([
    tx
      .select({ moduleId: planModules.moduleId, limits: planModules.limits })
      .from(planModules)
      .where(eq(planModules.planId, company.planId)),
    tx
      .select({ moduleId: companyModules.moduleId, state: companyModules.state, trialUntil: companyModules.trialUntil })
      .from(companyModules)
      .where(eq(companyModules.companyId, companyId)),
    tx.select({ id: modules.id }).from(modules).where(eq(modules.enabled, false)),
  ]);
  return resolveEntitlements({
    planModules: pm.map((r) => ({ moduleId: r.moduleId, limits: (r.limits ?? {}) as Limits })),
    overrides: ov,
    disabledModules: disabled.map((d) => d.id),
  });
}
