'use client';
import type { Plan } from '@hub/db/schema';
import { Checkbox, Field, Input, Table, TD, TH, toast } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { togglePlanModuleAction, updatePlanAction } from '@/app/actions/console';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton, useErrorText } from '@/components/forms';

const rm = (sen: number | null) => (sen === null ? '' : (sen / 100).toFixed(2));

export function PlanForm({ plan }: { plan: Omit<Plan, 'updatedAt'> & { updatedAt: string } }) {
  const t = useTranslations('console.plans');
  const [state, action] = useActionState<FormState, FormData>(updatePlanAction.bind(null, plan.id), {});
  const [auto, setAuto] = useState(plan.autoMode);
  useEffect(() => {
    if (state.ok) toast.success(t('saved'));
  }, [state, t]);
  const num = (name: string, label: string, value: number | string | null, step = '1') => (
    <Field label={label} htmlFor={`${plan.id}-${name}`}>
      <Input id={`${plan.id}-${name}`} name={name} type="number" min={0} step={step} defaultValue={value ?? ''} className="h-8" />
    </Field>
  );
  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {num('priceMonthly', t('price'), rm(plan.priceMonthlySen), '0.01')}
      {num('priceYearly', t('yearly'), rm(plan.priceYearlySen), '0.01')}
      {num('extraSeat', t('extraSeat'), rm(plan.extraSeatSen), '0.01')}
      {num('seatsIncluded', t('seats'), plan.seatsIncluded)}
      {num('aiAssists', t('assists'), plan.aiAssistsMonth)}
      {num('contacts', t('contacts'), plan.contactsSoftCap)}
      {num('knowledge', t('knowledge'), plan.knowledgeDocs)}
      {num('whatsapp', t('numbers'), plan.whatsappNumbers)}
      {num('mailboxes', t('mailboxes'), plan.mailboxes)}
      {num('retention', t('retention'), plan.auditRetentionDays)}
      <div className="col-span-2 flex items-end pb-1 sm:col-span-2">
        <Checkbox id={`${plan.id}-auto`} name="autoMode" checked={auto} onCheckedChange={setAuto}>
          {t('auto')}
        </Checkbox>
      </div>
      <div className="col-span-2 space-y-2 sm:col-span-3">
        <FormError state={state} />
        <SubmitButton variant="secondary">{t('save')}</SubmitButton>
      </div>
    </form>
  );
}

export function PlanModulesMatrix({
  plans,
  modules,
  included,
}: {
  plans: { id: string; label: string }[];
  modules: { id: string; label: string }[];
  included: string[];
}) {
  const t = useTranslations('console.plans');
  const errorText = useErrorText();
  const [set, setSet] = useState(() => new Set(included));
  const [busy, start] = useTransition();
  return (
    <Table>
      <thead>
        <tr>
          <TH>{t('module')}</TH>
          {plans.map((p) => (
            <TH key={p.id} className="text-center">
              {p.label}
            </TH>
          ))}
        </tr>
      </thead>
      <tbody>
        {modules.map((m) => (
          <tr key={m.id}>
            <TD className="text-sm">{m.label}</TD>
            {plans.map((p) => {
              const key = `${p.id}:${m.id}`;
              const on = set.has(key);
              return (
                <TD key={key} className="text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-[#1a6e99]"
                    aria-label={`${p.label}: ${m.label}`}
                    checked={on}
                    disabled={busy}
                    onChange={() =>
                      start(async () => {
                        const r = await togglePlanModuleAction(p.id, m.id, !on);
                        if (r.ok) {
                          setSet((s) => {
                            const n = new Set(s);
                            if (on) n.delete(key);
                            else n.add(key);
                            return n;
                          });
                        } else toast.error(errorText(r.error));
                      })
                    }
                  />
                </TD>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
