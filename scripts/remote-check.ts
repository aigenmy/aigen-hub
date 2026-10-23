// Read-only health check of the Supabase DEV project: migrations, RLS, the auth.users triggers, and that the
// app's connection can act as the `authenticated` role (what withClaims() does on every request).
//   pnpm remote:check
import postgres from 'postgres';
// @ts-expect-error -- plain .mjs helper shared with the web launcher
import { databaseUrl } from './user-env.mjs';

const url: string | undefined = databaseUrl();
if (!url) {
  console.error('AIGEN_HUB_DEV_DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  const sql = postgres(url!, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const [mig] = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
    const tables = await sql`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                             where n.nspname = 'public' and c.relkind = 'r' order by 1`;
    const triggers = await sql`select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal order by 1`;
    const [plans] = await sql`select count(*)::int as n from public.plans`;
    const [users] = await sql`select count(*)::int as n from auth.users`;
    const [profiles] = await sql`select count(*)::int as n from public.profiles`;
    const role = await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true)`;
      await tx`set local role authenticated`;
      const [r] = await tx`select current_user as role, (select count(*)::int from public.companies) as companies`;
      return r;
    });
    console.log(`migrations applied: ${mig?.n}`);
    console.log(`public tables: ${tables.length}, without RLS: ${tables.filter((t) => !t.relrowsecurity).map((t) => t.relname).join(', ') || 'none'}`);
    console.log(`auth.users triggers: ${triggers.map((t) => t.tgname).join(', ') || 'none (ensure_profile() will create profiles)'}`);
    console.log(`plans: ${plans?.n}, users: ${users?.n}, profiles: ${profiles?.n}`);
    console.log(`act as authenticated: ${role?.role === 'authenticated' ? 'yes' : 'NO'}, companies visible to a stranger: ${role?.companies}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
