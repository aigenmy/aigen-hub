// Lists the accounts in the Supabase DEV project (email, confirmed, staff, companies) — read-only.
//   pnpm remote:users
import postgres from 'postgres';
// @ts-expect-error -- plain .mjs helper shared with the web launcher
import { userEnv } from './user-env.mjs';

const url: string | undefined = userEnv('AIGEN_HUB_DEV_DATABASE_URL');
if (!url) {
  console.error('AIGEN_HUB_DEV_DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  const sql = postgres(url!, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const rows = await sql`
      select u.email, u.email_confirmed_at is not null as confirmed, u.last_sign_in_at,
             p.id is not null as has_profile, coalesce(p.is_staff, false) as staff,
             coalesce((select string_agg(c.name || ' (' || m.role || ')', ', ')
                         from public.company_members m join public.companies c on c.id = m.company_id
                        where m.user_id = u.id), '') as companies,
             (select count(*)::int from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified') as mfa
        from auth.users u left join public.profiles p on p.id = u.id
       order by u.created_at`;
    for (const r of rows) {
      console.log(
        `${r.email} | confirmed: ${r.confirmed ? 'yes' : 'no'} | signed in: ${r.last_sign_in_at ? 'yes' : 'no'} | profile: ${r.has_profile ? 'yes' : 'no'} | staff: ${r.staff ? 'yes' : 'no'} | 2-step: ${r.mfa ? 'on' : 'off'} | companies: ${r.companies || '-'}`,
      );
    }
    if (!rows.length) console.log('No accounts yet.');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
