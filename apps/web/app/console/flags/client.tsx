'use client';
import { Input, Switch, toast } from '@hub/ui';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { setFlagAction, setPlatformSettingAction } from '@/app/actions/console';
import { useErrorText } from '@/components/forms';

type Key = 'billing_enabled' | 'signups_open' | 'beta';

export function PlatformSwitches({ values }: { values: Record<Key, boolean> }) {
  const t = useTranslations('console.flags');
  const tc = useTranslations('common');
  const errorText = useErrorText();
  const [state, setState] = useState(values);
  const [busy, start] = useTransition();
  return (
    <ul className="divide-y divide-border">
      {(['signups_open', 'beta', 'billing_enabled'] as Key[]).map((k) => (
        <li key={k} className="flex items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="block font-medium">{t(`settings.${k}`)}</span>
            <span className="block text-sm text-text-2">{t(`settings.${k}Help`)}</span>
          </span>
          <Switch
            checked={state[k]}
            disabled={busy}
            label={t(`settings.${k}`)}
            onLabel={tc('on')}
            offLabel={tc('off')}
            onCheckedChange={(v) =>
              start(async () => {
                const r = await setPlatformSettingAction(k, v);
                if (r.ok) {
                  setState((s) => ({ ...s, [k]: v }));
                  toast.success(t('saved'));
                } else toast.error(errorText(r.error));
              })
            }
          />
        </li>
      ))}
    </ul>
  );
}

type Flag = { key: string; description: string; enabled: boolean; rolloutPercent: number };

export function FlagsList({ flags }: { flags: Flag[] }) {
  const t = useTranslations('console.flags');
  const tc = useTranslations('common');
  const errorText = useErrorText();
  const [state, setState] = useState(flags);
  const [busy, start] = useTransition();
  const save = (f: Flag) =>
    start(async () => {
      const r = await setFlagAction(f.key, f.enabled, f.rolloutPercent);
      if (r.ok) {
        setState((s) => s.map((x) => (x.key === f.key ? f : x)));
        toast.success(t('saved'));
      } else toast.error(errorText(r.error));
    });
  return (
    <ul className="divide-y divide-border">
      {state.map((f) => (
        <li key={f.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0">
            <code className="block text-sm font-medium">{f.key}</code>
            <span className="block text-sm text-text-2">{f.description}</span>
          </span>
          <span className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-text-2">
              {t('rollout')}
              <Input
                type="number"
                min={0}
                max={100}
                defaultValue={f.rolloutPercent}
                className="h-8 w-20"
                disabled={busy}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v !== f.rolloutPercent) save({ ...f, rolloutPercent: v });
                }}
              />
              %
            </label>
            <Switch checked={f.enabled} disabled={busy} label={f.key} onLabel={tc('on')} offLabel={tc('off')} onCheckedChange={(v) => save({ ...f, enabled: v })} />
          </span>
        </li>
      ))}
    </ul>
  );
}
