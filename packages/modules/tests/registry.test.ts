import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODULES, navFor } from '../src/index';

describe('module registry', () => {
  it('ids are unique', () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every module id exists in the database catalogue (migration 0003) and vice versa', () => {
    const sql = readFileSync(path.resolve(__dirname, '../../db/migrations/0003_reference_data.sql'), 'utf8');
    const block = sql.slice(sql.indexOf('insert into public.modules'), sql.indexOf('on conflict (id) do nothing;', sql.indexOf('insert into public.modules')));
    const dbIds = [...block.matchAll(/\('([a-z.]+)',\s*\d+/g)].map((m) => m[1]);
    expect(dbIds.sort()).toEqual(MODULES.map((m) => m.id).sort());
  });

  it('the menu shows only built modules, core ones always, never the Console', () => {
    const nav = navFor(['inbox', 'assistant', 'console'], 'owner').map((m) => m.id);
    expect(nav).toEqual(['home', 'team', 'settings']);
  });
});
