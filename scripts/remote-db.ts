// Runs migrations, or makes someone AIGen staff, on the Supabase DEV project.
// The connection string comes from the Windows user environment variable AIGEN_HUB_DEV_DATABASE_URL
// (never typed into a command, never stored in a file).
//   pnpm remote:migrate
//   pnpm remote:staff someone@example.com
import { runMigrations } from '@hub/db/migrate';
import postgres from 'postgres';
// @ts-expect-error -- plain .mjs helper shared with the web launcher
import { databaseUrl } from './user-env.mjs';

const url: string | undefined = databaseUrl();
if (!url) {
  console.error('AIGEN_HUB_DEV_DATABASE_URL is not set (Windows user environment variable).');
  process.exit(1);
}
const host = new URL(url).hostname;
if (!/supabase\.(co|com)$/.test(host)) {
  console.error(`Refusing: ${host} is not a Supabase host.`);
  process.exit(1);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'migrate') {
    await runMigrations(url!);
    console.log(`Migrations applied on ${host}.`);
  } else if (cmd === 'staff' && arg) {
    const sql = postgres(url!, { max: 1, prepare: false, onnotice: () => {} });
    try {
      const r = await sql`update public.profiles set is_staff = true where email = ${arg.toLowerCase()} returning email`;
      console.log(r.length ? `${arg} is now AIGen staff (needs 2-step sign-in for the Console).` : `No account with ${arg} yet: sign up first.`);
    } finally {
      await sql.end();
    }
  } else {
    console.error('Usage: remote-db.ts migrate | staff <email>');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
