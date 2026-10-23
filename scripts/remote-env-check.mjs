// Checks the AIGEN_HUB_DEV_* Windows variables without printing their values: the shape of each, that the
// publishable key belongs to the database's project, and that the database accepts the password.
//   node scripts/remote-env-check.mjs
import postgres from 'postgres';
import { databaseUrl, projectUrlFromDatabaseUrl, userEnv } from './user-env.mjs';

const key = userEnv('AIGEN_HUB_DEV_SUPABASE_KEY');
const db = databaseUrl();
const ok = (v) => (v ? 'ok' : 'PROBLEM');

let dbHostOk = false;
let dbPasswordOk = false;
try {
  const u = new URL(db);
  dbHostOk = /pooler\.supabase\.com$/.test(u.hostname);
  dbPasswordOk = !!u.password && !/YOUR-PASSWORD|%5B|\[/i.test(u.password);
} catch {}
const projectUrl = projectUrlFromDatabaseUrl(db);

console.log(`Database string:  ${ok(projectUrl && dbHostOk)} ; password filled in: ${ok(dbPasswordOk)}`);
console.log(`Separate password variable: ${userEnv('AIGEN_HUB_DEV_DB_PASSWORD') ? 'set' : 'not set'}`);
console.log(`Project: ${projectUrl ? projectUrl.replace(/https:\/\/([a-z0-9]{5})[a-z0-9]+/, 'https://$1…') : '?'} (taken from the database string)`);
if (key && projectUrl) {
  const res = await fetch(`${projectUrl}/auth/v1/settings`, { headers: { apikey: key } });
  console.log(`Publishable key fits the project: ${ok(res.status === 200)}`);
}
if (db && dbPasswordOk) {
  const sql = postgres(db, { max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
  try {
    await sql`select 1`;
    console.log('Database password: ok');
  } catch (e) {
    console.log(`Database password: ${/password authentication failed/.test(String(e?.message)) ? 'REFUSED by Supabase' : `could not test (${e?.code ?? 'error'})`}`);
  } finally {
    await sql.end({ timeout: 1 });
  }
}
