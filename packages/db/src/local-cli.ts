// pnpm db:local:start | stop | reset — the local development database (see local.ts).
import { LOCAL_DB, destroyLocalPostgres, localUrl, prepareDatabase, startLocalPostgres, stopLocalPostgres } from './local.js';

const cmd = process.argv[2] ?? 'start';

async function main() {
  if (cmd === 'stop') {
    await stopLocalPostgres();
    console.log('Local Postgres stopped.');
    return;
  }
  if (cmd === 'reset') await destroyLocalPostgres();
  await startLocalPostgres();
  await prepareDatabase(LOCAL_DB);
  console.log(`Local Postgres ready: ${localUrl()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
