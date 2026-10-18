// LOCAL ONLY: fills the local database with the demo company and test accounts (no passwords; local sign-in is one click).
// Uses the same RPCs as the app (create company, invite, accept), so the seed also exercises the rules.
//   pnpm seed:demo
import { acceptInvitation, createCompany, createDb, createInvitation, withClaims, type Db } from '@hub/db';
import { LEGAL_DOCS } from '@hub/legal';
import { sql } from 'drizzle-orm';

const url = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/hub';
if (!['127.0.0.1', 'localhost', '::1'].includes(new URL(url).hostname)) {
  console.error('seed-demo only runs against a database on this computer.');
  process.exit(1);
}

const { db, client } = createDb(url, { max: 2 });
type Row = Record<string, unknown>;
const q = async (query: ReturnType<typeof sql>) => (await db.execute(query)) as unknown as Row[];

const people = {
  staff: { email: 'staff@aigen.test', name: 'Michael (AIGen staff)' },
  aminah: { email: 'aminah@demo.aigen.test', name: 'Aminah Rahman' },
  daniel: { email: 'daniel@demo.aigen.test', name: 'Daniel Tan' },
  aisyah: { email: 'aisyah@demo.aigen.test', name: 'Siti Aisyah' },
  weijie: { email: 'weijie@demo.aigen.test', name: 'Lim Wei Jie' },
  rajesh: { email: 'rajesh@demo.aigen.test', name: 'Rajesh Kumar' },
} as const;
type P = keyof typeof people;
const ids = {} as Record<P, string>;

const as = <T>(p: P, fn: Parameters<typeof withClaims<T>>[3]) =>
  withClaims(db as Db, { sub: ids[p], email: people[p].email, aal: 'aal1' }, { ip: '127.0.0.1', userAgent: 'seed-demo' }, fn);

async function main() {
  for (const [key, p] of Object.entries(people) as [P, (typeof people)[P]][]) {
    const [existing] = await q(sql`select id from auth.users where email = ${p.email}`);
    ids[key] =
      (existing?.id as string) ??
      ((
        await q(sql`insert into auth.users (email, email_confirmed_at, raw_user_meta_data)
                    values (${p.email}, now(), ${JSON.stringify({ full_name: p.name, locale: key === 'aminah' ? 'ms' : key === 'weijie' ? 'zh' : 'en' })}::jsonb)
                    returning id`)
      )[0]!.id as string);
  }
  await q(sql`update public.profiles set is_staff = true where id = ${ids.staff}`);

  // Legal documents: publish every bundled version (local test mode allows it without operator details).
  for (const d of LEGAL_DOCS) {
    await q(sql`insert into public.legal_documents (kind, locale, version, title, body_md, sha256, summary, requires_acceptance, published_at)
                values (${d.kind}::public.legal_kind, ${d.locale}, ${d.version}, ${d.title}, ${d.bodyMd}, ${d.sha256}, ${d.summary}, ${d.requiresAcceptance}, now())
                on conflict (kind, locale, version) do nothing`);
  }

  const [demo] = await q(sql`select id from public.companies where name = 'Kedai Kopi Mesra Sdn Bhd'`);
  if (!demo) {
    const kopi = await as('aminah', (tx) => createCompany(tx, 'Kedai Kopi Mesra Sdn Bhd', 'fnb', 'ms'));
    await q(sql`update public.companies set plan_id = 'growth', seats_limit = 6, is_founder = true, is_internal = true where id = ${kopi}`);
    const join = async (by: P, who: P, role: 'admin' | 'agent' | 'viewer') => {
      const inv = await as(by, (tx) => createInvitation(tx, kopi, people[who].email, role));
      await as(who, (tx) => acceptInvitation(tx, inv.token));
    };
    await join('aminah', 'daniel', 'admin');
    await join('daniel', 'aisyah', 'agent');
    await join('daniel', 'weijie', 'agent');
    await join('aminah', 'rajesh', 'viewer');
    await as('daniel', (tx) => createInvitation(tx, kopi, 'farah@demo.aigen.test', 'agent'));

    const own = await as('staff', (tx) => createCompany(tx, 'AIGen.my', 'services', 'en'));
    await q(sql`update public.companies set plan_id = 'business', seats_limit = 12, is_internal = true where id = ${own}`);
    // Demo people have already read the documents; new sign-ups meet the acceptance page.
    for (const p of ['aminah', 'daniel', 'aisyah', 'weijie', 'rajesh', 'staff'] as P[]) {
      await q(sql`insert into public.legal_acceptances (user_id, document_id, ip, user_agent)
                  select ${ids[p]}, id, '127.0.0.1', 'seed-demo' from public.legal_documents where requires_acceptance`);
    }
    console.log('Demo company "Kedai Kopi Mesra Sdn Bhd" and the AIGen.my test company created.');
  } else {
    console.log('Demo data already there; nothing to do.');
  }
  console.log(`Test accounts (sign in with one click on the local sign-in page): ${Object.values(people).map((p) => p.email).join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
