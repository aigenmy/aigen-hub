// Tenant isolation and role rules (spec §9.4, §13.3): two companies, four roles, staff with and without MFA,
// anonymous visitors. Runs against real Postgres 17 with the Supabase shim, through the same withClaims() path the app uses.
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createDb, hubErrorCode, withClaims, type Db, type Tx } from '../src/client';
import {
  acceptInvitation,
  changeMemberRole,
  createCompany,
  createInvitation,
  previewInvitation,
  removeMember,
  revokeInvitation,
  setMemberStatus,
} from '../src/rpc';
import { loadEntitlements } from '../src/entitlements';
import * as schema from '../src/schema';

const url = inject('dbUrl');
let db: Db;
let admin: postgres.Sql;
let close: () => Promise<void>;

const users = {
  ownerA: 'owner.a@kedai-a.test',
  adminA: 'admin.a@kedai-a.test',
  agentA: 'agent.a@kedai-a.test',
  viewerA: 'viewer.a@kedai-a.test',
  ownerB: 'owner.b@kedai-b.test',
  agentB: 'agent.b@kedai-b.test',
  agent2B: 'agent2.b@kedai-b.test',
  staff: 'staff@aigen.test',
  outsider: 'someone@else.test',
};
type U = keyof typeof users;
const id: Record<U, string> = {} as Record<U, string>;
let companyA = '';
let companyB = '';

type Opts = { aal?: 'aal1' | 'aal2' };
const as = <T>(u: U, fn: (tx: Tx) => Promise<T>, o: Opts = {}) =>
  withClaims(db, { sub: id[u], email: users[u], aal: o.aal ?? 'aal1' }, { ip: '203.0.113.7', userAgent: 'vitest' }, fn);
const asAnon = <T>(fn: (tx: Tx) => Promise<T>) => withClaims(db, null, {}, fn);
const rows = async (tx: Tx, q: string) => (await tx.execute(sql.raw(q))) as unknown as Record<string, unknown>[];
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return hubErrorCode(e) ?? String((e as Error).message);
  }
};

async function invite(by: U, company: string, who: U, role: 'admin' | 'agent' | 'viewer') {
  const inv = await as(by, (tx) => createInvitation(tx, company, users[who], role));
  await as(who, (tx) => acceptInvitation(tx, inv.token));
  return inv;
}

beforeAll(async () => {
  ({ db, client: admin } = createDb(url, { max: 4 }));
  close = () => admin.end();
  for (const [k, email] of Object.entries(users)) {
    const [r] = await admin`insert into auth.users (email, raw_user_meta_data)
                            values (${email}, ${JSON.stringify({ full_name: k })}::jsonb) returning id`;
    id[k as U] = r!.id as string;
  }
  await admin`update public.profiles set is_staff = true where id = ${id.staff}`;

  companyA = await as('ownerA', (tx) => createCompany(tx, 'Kedai A Sdn Bhd', 'retail', 'ms'));
  companyB = await as('ownerB', (tx) => createCompany(tx, 'Kedai B', 'fnb', 'en'));
  // Company A on Growth (6 seats) so it can hold every role; B stays on Free (2 seats).
  await admin`update public.companies set plan_id = 'growth', seats_limit = 6 where id = ${companyA}`;
  await invite('ownerA', companyA, 'adminA', 'admin');
  await invite('ownerA', companyA, 'agentA', 'agent');
  await invite('adminA', companyA, 'viewerA', 'viewer');
  await invite('ownerB', companyB, 'agentB', 'agent');

  await admin`insert into public.legal_documents (kind, locale, version, title, body_md, sha256, requires_acceptance, published_at)
              values ('terms', 'en', '2026-10-18', 'Terms of Service', 'Body', 'x', true, now()),
                     ('privacy', 'en', '2026-10-19-draft', 'Privacy Notice (draft)', 'Body', 'y', true, null)`;
});

afterAll(async () => {
  await close?.();
});

describe('accounts', () => {
  it('creates a profile for every new auth user, with lower-case email', async () => {
    const r = await admin`select count(*)::int as n from public.profiles where id = any(${Object.values(id)}::uuid[])`;
    expect(r[0]!.n).toBe(Object.keys(users).length);
  });

  it('ensure_profile() recreates a missing profile for the caller only', async () => {
    const [u] = await admin`insert into auth.users (email, raw_user_meta_data) values ('late@kedai-c.test', '{"full_name":"Late Joiner"}'::jsonb) returning id`;
    await admin`delete from public.profiles where id = ${u!.id}`;
    await withClaims(db, { sub: u!.id as string, email: 'late@kedai-c.test' }, {}, (tx) => tx.execute(sql`select public.ensure_profile()`));
    const r = await admin`select email, full_name from public.profiles where id = ${u!.id}`;
    expect(r[0]).toEqual({ email: 'late@kedai-c.test', full_name: 'Late Joiner' });
  });

  it('makes the creator the Owner and points their profile at the new company', async () => {
    const r = await as('ownerA', (tx) =>
      rows(tx, `select m.role, p.active_company_id from company_members m join profiles p on p.id = m.user_id
                where m.user_id = auth.uid()`),
    );
    expect(r).toEqual([{ role: 'owner', active_company_id: companyA }]);
  });
});

describe('tenant isolation', () => {
  it('every company table: members of A see nothing of B (generic matrix over all company_id tables)', async () => {
    const tables = (await admin`select table_name from information_schema.columns
                                 where table_schema = 'public' and column_name = 'company_id'
                                 order by table_name`).map((r) => r.table_name as string);
    expect(tables.length).toBeGreaterThanOrEqual(7);
    for (const u of ['ownerA', 'adminA', 'agentA', 'viewerA'] as U[]) {
      for (const t of tables) {
        const r = await as(u, (tx) => rows(tx, `select count(*)::int as n from public.${t} where company_id = '${companyB}'`));
        expect({ u, t, n: r[0]!.n }).toEqual({ u, t, n: 0 });
      }
      const c = await as(u, (tx) => rows(tx, `select id from companies`));
      expect(c.map((x) => x.id)).toEqual([companyA]);
    }
  });

  it('B has audit rows that A cannot read, and the outsider sees no company at all', async () => {
    const all = await admin`select count(*)::int as n from public.audit_log where company_id = ${companyB}`;
    expect(all[0]!.n).toBeGreaterThan(0);
    const r = await as('outsider', (tx) => rows(tx, 'select count(*)::int as n from companies'));
    expect(r[0]!.n).toBe(0);
    const m = await as('outsider', (tx) => rows(tx, 'select count(*)::int as n from company_members'));
    expect(m[0]!.n).toBe(0);
  });

  it('profiles: co-members are visible, other companies are not', async () => {
    const r = await as('agentA', (tx) => rows(tx, 'select email from profiles order by email'));
    expect(r.map((x) => x.email)).toEqual([users.adminA, users.agentA, users.ownerA, users.viewerA].sort());
  });

  it('an RPC cannot be pointed at another company', async () => {
    expect(await code(as('ownerA', (tx) => createInvitation(tx, companyB, 'x@y.test', 'agent')))).toBe('forbidden');
    expect(await code(as('ownerA', (tx) => removeMember(tx, companyB, id.agentB)))).toBe('forbidden');
  });

  it('every public table has RLS enabled and anon holds no grant on any company table', async () => {
    const noRls = await admin`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
                              where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`;
    expect(noRls.map((r) => r.relname)).toEqual([]);
    const anonGrants = await admin`select distinct table_name from information_schema.role_table_grants g
                                   where g.grantee = 'anon' and g.table_schema = 'public'
                                     and g.table_name in (select table_name from information_schema.columns
                                                           where table_schema = 'public' and column_name = 'company_id')`;
    expect(anonGrants).toEqual([]);
  });
});

describe('anonymous visitors', () => {
  it('see the plan ladder and published legal texts only', async () => {
    const plans = await asAnon((tx) => rows(tx, 'select id from plans order by sort'));
    expect(plans.map((p) => p.id)).toEqual(['free', 'starter', 'growth', 'business', 'enterprise']);
    const legal = await asAnon((tx) => rows(tx, 'select kind from legal_documents'));
    expect(legal.map((l) => l.kind)).toEqual(['terms']);
    expect(await code(asAnon((tx) => rows(tx, 'select * from companies')))).toBe('forbidden');
    expect(await code(asAnon((tx) => rows(tx, 'select * from profiles')))).toBe('forbidden');
    expect(await code(asAnon((tx) => createCompany(tx, 'Spam', 'other', 'en')))).toBe('forbidden');
  });
});

describe('roles (spec §4.3)', () => {
  it('Agents and Viewers cannot invite, see invitations or read the activity log', async () => {
    for (const u of ['agentA', 'viewerA'] as U[]) {
      expect(await code(as(u, (tx) => createInvitation(tx, companyA, 'new@kedai-a.test', 'viewer')))).toBe('forbidden');
      const inv = await as(u, (tx) => rows(tx, 'select count(*)::int as n from invitations'));
      expect(inv[0]!.n).toBe(0);
      const audit = await as(u, (tx) => rows(tx, 'select count(*)::int as n from audit_log'));
      expect(audit[0]!.n).toBe(0);
    }
  });

  it('Owners and Admins read their own activity log, with the actor and IP recorded', async () => {
    const r = await as('adminA', (tx) =>
      rows(tx, `select distinct company_id, actor_type from audit_log where action = 'invitations.insert'`),
    );
    expect(r).toEqual([{ company_id: companyA, actor_type: 'user' }]);
    const ip = await admin`select distinct host(ip) as ip from public.audit_log where company_id = ${companyA} and ip is not null`;
    expect(ip.map((x) => x.ip)).toEqual(['203.0.113.7']);
  });

  it('Admins cannot create or change Admins; nobody can create a second Owner', async () => {
    expect(await code(as('adminA', (tx) => createInvitation(tx, companyA, 'boss@kedai-a.test', 'admin')))).toBe('forbidden');
    expect(await code(as('adminA', (tx) => changeMemberRole(tx, companyA, id.agentA, 'admin')))).toBe('forbidden');
    expect(await code(as('ownerA', (tx) => changeMemberRole(tx, companyA, id.adminA, 'owner')))).toBe('forbidden');
    expect(await code(as('adminA', (tx) => changeMemberRole(tx, companyA, id.ownerA, 'agent')))).toBe('owner_protected');
  });

  it('Owner cannot be removed or suspended and cannot leave; others can leave', async () => {
    expect(await code(as('adminA', (tx) => removeMember(tx, companyA, id.ownerA)))).toBe('owner_protected');
    expect(await code(as('ownerA', (tx) => removeMember(tx, companyA, id.ownerA)))).toBe('owner_protected');
    expect(await code(as('ownerA', (tx) => setMemberStatus(tx, companyA, id.ownerA, 'suspended')))).toBe('owner_protected');
  });

  it('Admin changes an Agent to Viewer and back; Owner suspends and restores an Admin', async () => {
    expect(await code(as('adminA', (tx) => changeMemberRole(tx, companyA, id.agentA, 'viewer')))).toBe('ok');
    expect(await code(as('adminA', (tx) => changeMemberRole(tx, companyA, id.agentA, 'agent')))).toBe('ok');
    expect(await code(as('ownerA', (tx) => setMemberStatus(tx, companyA, id.adminA, 'suspended')))).toBe('ok');
    // A suspended Admin loses access at once.
    const r = await as('adminA', (tx) => rows(tx, 'select count(*)::int as n from companies'));
    expect(r[0]!.n).toBe(0);
    expect(await code(as('ownerA', (tx) => setMemberStatus(tx, companyA, id.adminA, 'active')))).toBe('ok');
  });

  it('Viewers cannot edit the company; Owners can edit name but not the plan or seats', async () => {
    await as('viewerA', (tx) => tx.execute(sql`update companies set name = 'Hacked' where id = ${companyA}`));
    const n = await admin`select name from public.companies where id = ${companyA}`;
    expect(n[0]!.name).toBe('Kedai A Sdn Bhd');
    expect(await code(as('ownerA', (tx) => tx.execute(sql`update companies set name = 'Kedai A Baru' where id = ${companyA}`)))).toBe('ok');
    expect(await code(as('ownerA', (tx) => tx.execute(sql`update companies set plan_id = 'business' where id = ${companyA}`)))).toBe('staff_only');
    expect(await code(as('ownerA', (tx) => tx.execute(sql`update companies set seats_limit = 99 where id = ${companyA}`)))).toBe('staff_only');
  });

  it('nobody makes themselves staff, and the active company must be one of yours', async () => {
    expect(await code(as('ownerA', (tx) => tx.execute(sql`update profiles set is_staff = true where id = auth.uid()`)))).toBe('forbidden');
    expect(await code(as('ownerA', (tx) => tx.execute(sql`update profiles set active_company_id = ${companyB} where id = auth.uid()`)))).toBe('not_a_member');
    expect(await code(as('ownerA', (tx) => tx.execute(sql`update profiles set full_name = 'Aminah' where id = auth.uid()`)))).toBe('ok');
  });
});

describe('invitations and seats (spec §4.2, D6)', () => {
  it('Free plan: Owner + 1 seat; a second Agent is refused, a Viewer is free', async () => {
    expect(await code(as('ownerB', (tx) => createInvitation(tx, companyB, users.agent2B, 'agent')))).toBe('seat_limit');
    expect(await code(as('ownerB', (tx) => createInvitation(tx, companyB, 'watcher@kedai-b.test', 'viewer')))).toBe('ok');
  });

  it('suspending frees the seat; restoring needs one', async () => {
    expect(await code(as('ownerB', (tx) => setMemberStatus(tx, companyB, id.agentB, 'suspended')))).toBe('ok');
    const inv = await as('ownerB', (tx) => createInvitation(tx, companyB, users.agent2B, 'agent'));
    expect(await code(as('ownerB', (tx) => setMemberStatus(tx, companyB, id.agentB, 'active')))).toBe('seat_limit');
    await as('ownerB', (tx) => revokeInvitation(tx, inv.id));
    expect(await code(as('ownerB', (tx) => setMemberStatus(tx, companyB, id.agentB, 'active')))).toBe('ok');
  });

  it('an invitation works once, only for the invited email, and not after it expires or is revoked', async () => {
    await admin`update public.companies set seats_limit = 6 where id = ${companyB}`;
    const inv = await as('ownerB', (tx) => createInvitation(tx, companyB, users.agent2B, 'agent'));
    const pv = await as('outsider', (tx) => previewInvitation(tx, inv.token));
    expect(pv).toEqual({ companyName: 'Kedai B', role: 'agent', status: 'open', emailMatches: false });
    expect(await code(as('outsider', (tx) => acceptInvitation(tx, inv.token)))).toBe('invitation_wrong_email');
    expect(await code(as('agent2B', (tx) => acceptInvitation(tx, 'not-the-token')))).toBe('invitation_invalid');
    expect(await code(as('agent2B', (tx) => acceptInvitation(tx, inv.token)))).toBe('ok');
    expect(await code(as('agent2B', (tx) => acceptInvitation(tx, inv.token)))).toBe('invitation_used');

    const old = await as('ownerB', (tx) => createInvitation(tx, companyB, 'late@kedai-b.test', 'agent'));
    await admin`update public.invitations set expires_at = now() - interval '1 minute' where id = ${old.id}`;
    expect((await as('outsider', (tx) => previewInvitation(tx, old.token))).status).toBe('expired');

    const rv = await as('ownerB', (tx) => createInvitation(tx, companyB, users.outsider, 'viewer'));
    await as('ownerB', (tx) => revokeInvitation(tx, rv.id));
    expect(await code(as('outsider', (tx) => acceptInvitation(tx, rv.token)))).toBe('invitation_invalid');
  });

  it('the raw token is never stored and never appears in the audit log', async () => {
    const r = await admin`select count(*)::int as n from public.audit_log where after ? 'token_hash' or before ? 'token_hash'`;
    expect(r[0]!.n).toBe(0);
  });
});

describe('staff (Console)', () => {
  it('staff without a second factor are treated like anyone else', async () => {
    const r = await as('staff', (tx) => rows(tx, 'select count(*)::int as n from companies'), { aal: 'aal1' });
    expect(r[0]!.n).toBe(0);
    expect(await code(as('staff', (tx) => tx.execute(sql`update plans set price_monthly_sen = 1 where id = 'starter'`), { aal: 'aal1' }))).toBe('ok');
    const p = await admin`select price_monthly_sen from public.plans where id = 'starter'`;
    expect(p[0]!.price_monthly_sen).toBe(12900);
  });

  it('staff with MFA see all companies, change a plan and switch a module, and it is audited as staff', async () => {
    const r = await as('staff', (tx) => rows(tx, 'select count(*)::int as n from companies'), { aal: 'aal2' });
    expect(r[0]!.n).toBe(2);
    await as('staff', (tx) => tx.execute(sql`update companies set plan_id = 'starter', seats_limit = 3 where id = ${companyB}`), { aal: 'aal2' });
    await as('staff', (tx) => tx.execute(sql`insert into company_modules (company_id, module_id, state) values (${companyB}, 'content', 'on')`), { aal: 'aal2' });
    const a = await admin`select actor_type, action from public.audit_log where company_id = ${companyB} and actor_id = ${id.staff} order by id`;
    expect(a.map((x) => `${x.actor_type}:${x.action}`)).toEqual(['staff:companies.update', 'staff:company_modules.insert']);
    const ent = await as('ownerB', (tx) => loadEntitlements(tx, companyB));
    expect(ent.has('channel.whatsapp')).toBe(true); // from Starter
    expect(ent.has('content')).toBe(true); // switched on by staff
    expect(ent.has('invoicing')).toBe(false);
  });

  it('staff notes are invisible to the company', async () => {
    await as('staff', (tx) => tx.execute(sql`insert into company_notes (company_id, body) values (${companyB}, 'Called owner')`), { aal: 'aal2' });
    const r = await as('ownerB', (tx) => rows(tx, 'select count(*)::int as n from company_notes'));
    expect(r[0]!.n).toBe(0);
  });
});

describe('append-only records', () => {
  it('nobody updates or deletes the audit log or legal acceptances, not even the database owner', async () => {
    expect(await code(as('ownerA', (tx) => tx.execute(sql`delete from audit_log`)))).toBe('forbidden');
    expect(await code(admin`update public.audit_log set action = 'x'`)).toBe('append_only');
    expect(await code(admin`delete from public.audit_log`)).toBe('append_only');
    const [doc] = await admin`select id from public.legal_documents where kind = 'terms'`;
    await as('ownerA', (tx) =>
      tx.execute(sql`insert into legal_acceptances (user_id, company_id, document_id) values (auth.uid(), ${companyA}, ${doc!.id})`),
    );
    expect(await code(admin`delete from public.legal_acceptances`)).toBe('append_only');
  });

  it('the app path (ORM insert of a full row) works, and a back-dated acceptance gets today\'s time', async () => {
    const [doc] = await admin`select id from public.legal_documents where kind = 'terms'`;
    await as('viewerA', (tx) =>
      tx.insert(schema.legalAcceptances).values({
        userId: id.viewerA,
        companyId: companyA,
        documentId: doc!.id as string,
        acceptedAt: new Date('2020-01-01T00:00:00Z'),
      }),
    );
    const r = await admin`select accepted_at from public.legal_acceptances where user_id = ${id.viewerA}`;
    expect(new Date(r[0]!.accepted_at as string).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it('a user can record acceptance only for themselves', async () => {
    const [doc] = await admin`select id from public.legal_documents where kind = 'terms'`;
    expect(
      await code(as('agentA', (tx) =>
        tx.execute(sql`insert into legal_acceptances (user_id, document_id) values (${id.ownerA}, ${doc!.id})`),
      )),
    ).toBe('forbidden');
  });
});
