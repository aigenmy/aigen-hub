// Builds a fresh `hub_e2e` database (shim + migrations + demo seed) for the Playwright run, so tests never
// depend on what someone clicked in the everyday local database.
import { spawnSync } from 'node:child_process';
import { localUrl, prepareDatabase, startLocalPostgres } from '@hub/db/local';

async function main() {
  const { port } = await startLocalPostgres();
  const url = await prepareDatabase('hub_e2e', port, { recreate: true });
  const r = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-demo.ts'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`E2E database ready: ${localUrl('hub_e2e', port)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
