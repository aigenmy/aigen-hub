'use client';
import { Badge, Checkbox, Field, Input, Select, Table, TD, TH, Textarea, toast } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { addCompanyNoteAction, setCompanyModuleAction, updateCompanyPlanAction } from '@/app/actions/console';
import type { FormState } from '@/app/actions/types';
import { FormError, SubmitButton, useErrorText } from '@/components/forms';

const STATUSES = ['trialing', 'active', 'past_due', 'cancelled', 'suspended'] as const;

export function CompanyPlanForm(p: {
  companyId: string;
  plans: { id: string; label: string }[];
  planId: string;
  planStatus: string;
  seatsLimit: number;
  isFounder: boolean;
  isInternal: boolean;
}) {
  const t = useTranslations('console.company');
  const tc = useTranslations('common');
  const [state, action] = useActionState<FormState, FormData>(updateCompanyPlanAction.bind(null, p.companyId), {});
  const [founder, setFounder] = useState(p.isFounder);
  const [internal, setInternal] = useState(p.isInternal);
  useEffect(() => {
    if (state.ok) toast.success(t('saved'));
  }, [state, t]);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <Field label={t('plan')} htmlFor="planId">
        <Select id="planId" name="planId" defaultValue={p.planId}>
          {p.plans.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('status')} htmlFor="planStatus">
        <Select id="planStatus" name="planStatus" defaultValue={p.planStatus}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {tc(`planStatus.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('seatsLimit')} htmlFor="seatsLimit">
        <Input id="seatsLimit" name="seatsLimit" type="number" min={1} max={500} defaultValue={p.seatsLimit} />
      </Field>
      <div className="flex flex-wrap gap-5 sm:col-span-3">
        <Checkbox id="isFounder" name="isFounder" checked={founder} onCheckedChange={setFounder}>
          {t('founder')}
        </Checkbox>
        <Checkbox id="isInternal" name="isInternal" checked={internal} onCheckedChange={setInternal}>
          {t('internal')}
        </Checkbox>
      </div>
      <div className="space-y-2 sm:col-span-3">
        <FormError state={state} />
        <SubmitButton>{t('save')}</SubmitButton>
      </div>
    </form>
  );
}

type ModuleRow = { id: string; label: string; built: boolean; inPlan: boolean; override: 'on' | 'off' | 'default' };

export function ModulesTable({ companyId, rows }: { companyId: string; rows: ModuleRow[] }) {
  const t = useTranslations('console.company');
  const errorText = useErrorText();
  const [state, setState] = useState(rows);
  const [busy, start] = useTransition();
  return (
    <Table>
      <thead>
        <tr>
          <TH>{t('module')}</TH>
          <TH>{t('fromPlan')}</TH>
          <TH className="w-48">{t('override')}</TH>
        </tr>
      </thead>
      <tbody>
        {state.map((m) => {
          const effective = m.override === 'default' ? m.inPlan : m.override === 'on';
          return (
            <tr key={m.id}>
              <TD>
                <span className="font-medium">{m.label}</span>
                {!m.built ? (
                  <Badge className="ml-2">{t('notBuilt')}</Badge>
                ) : null}
              </TD>
              <TD className="text-sm">
                {m.inPlan ? <Badge tone="success">{t('included')}</Badge> : <span className="text-text-2">{t('notIncluded')}</span>}
                {effective !== m.inPlan ? <Badge tone="warning" className="ml-2">{effective ? t('forcedOn') : t('forcedOff')}</Badge> : null}
              </TD>
              <TD>
                <Select
                  aria-label={`${t('override')}: ${m.label}`}
                  value={m.override}
                  disabled={busy}
                  className="h-8 text-sm"
                  onChange={(e) => {
                    const next = e.target.value as ModuleRow['override'];
                    start(async () => {
                      const r = await setCompanyModuleAction(companyId, m.id, next);
                      if (r.ok) {
                        setState((s) => s.map((x) => (x.id === m.id ? { ...x, override: next } : x)));
                        toast.success(t('saved'));
                      } else toast.error(errorText(r.error));
                    });
                  }}
                >
                  <option value="default">{t('moduleDefault')}</option>
                  <option value="on">{t('moduleOn')}</option>
                  <option value="off">{t('moduleOff')}</option>
                </Select>
              </TD>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export function NotesForm({ companyId }: { companyId: string }) {
  const t = useTranslations('console.company');
  const [state, action] = useActionState<FormState, FormData>(addCompanyNoteAction.bind(null, companyId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <Textarea name="body" required maxLength={4000} placeholder={t('notePlaceholder')} aria-label={t('notes')} />
      <FormError state={state} />
      <SubmitButton variant="secondary">{t('addNote')}</SubmitButton>
    </form>
  );
}
