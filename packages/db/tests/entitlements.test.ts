import { describe, expect, it } from 'vitest';
import { resolveEntitlements } from '../src/entitlements';

const plan = [
  { moduleId: 'inbox', limits: {} },
  { moduleId: 'assistant', limits: { assists: 50, auto: false } },
  { moduleId: 'team', limits: {} },
];

describe('resolveEntitlements', () => {
  it('starts from the plan, with its limits', () => {
    const e = resolveEntitlements({ planModules: plan, overrides: [], disabledModules: [] });
    expect([...e.keys()].sort()).toEqual(['assistant', 'inbox', 'team']);
    expect(e.get('assistant')).toEqual({ assists: 50, auto: false });
  });

  it('adds modules switched on, removes modules switched off', () => {
    const e = resolveEntitlements({
      planModules: plan,
      overrides: [
        { moduleId: 'content', state: 'on' },
        { moduleId: 'assistant', state: 'off' },
      ],
      disabledModules: [],
    });
    expect(e.has('content')).toBe(true);
    expect(e.has('assistant')).toBe(false);
  });

  it('ignores an "on" override whose trial has ended', () => {
    const e = resolveEntitlements({
      planModules: plan,
      overrides: [
        { moduleId: 'content', state: 'on', trialUntil: '2026-10-01' },
        { moduleId: 'deals', state: 'on', trialUntil: '2026-12-31' },
      ],
      disabledModules: [],
      today: '2026-10-18',
    });
    expect(e.has('content')).toBe(false);
    expect(e.has('deals')).toBe(true);
  });

  it('a module AIGen disabled globally is gone for everyone', () => {
    const e = resolveEntitlements({
      planModules: plan,
      overrides: [{ moduleId: 'inbox', state: 'on' }],
      disabledModules: ['inbox'],
    });
    expect(e.has('inbox')).toBe(false);
  });
});
