// Starts the app on this computer in LOCAL test mode: local Postgres (pnpm db:local:start), test accounts,
// no Supabase. Never used on Vercel (lib/env.ts refuses local mode there).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = {
  ...process.env,
  AUTH_MODE: 'local',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/hub',
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  NEXT_TELEMETRY_DISABLED: '1',
};

const port = process.env.PORT ?? '3000';
const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', '--port', port], {
  cwd: appDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
child.on('exit', (code) => process.exit(code ?? 0));
