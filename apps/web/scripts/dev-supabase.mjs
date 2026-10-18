// Starts the app on this computer against the Supabase DEV project (real sign-in, email links).
// The connection values come from Windows user environment variables that Michael sets once
// (no file, nothing under D:\):
//   AIGEN_HUB_DEV_SUPABASE_URL, AIGEN_HUB_DEV_SUPABASE_KEY (publishable key), AIGEN_HUB_DEV_DATABASE_URL
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabaseBaseUrl, userEnv } from '../../../scripts/user-env.mjs';

const names = ['AIGEN_HUB_DEV_SUPABASE_URL', 'AIGEN_HUB_DEV_SUPABASE_KEY', 'AIGEN_HUB_DEV_DATABASE_URL'];
const values = Object.fromEntries(names.map((n) => [n, userEnv(n)]));
const missing = names.filter((n) => !values[n]);
if (missing.length) {
  console.error(`Missing Windows user environment variables: ${missing.join(', ')}. See UPDATE\\app.aigen.my-INSTRUCTIONS.txt.`);
  process.exit(1);
}

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.PORT ?? '3000';
const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', '--port', port], {
  cwd: appDir,
  env: {
    ...process.env,
    AUTH_MODE: 'supabase',
    NEXT_PUBLIC_SUPABASE_URL: supabaseBaseUrl(values.AIGEN_HUB_DEV_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.AIGEN_HUB_DEV_SUPABASE_KEY,
    DATABASE_URL: values.AIGEN_HUB_DEV_DATABASE_URL,
    APP_URL: `http://localhost:${port}`,
    NEXT_TELEMETRY_DISABLED: '1',
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
child.on('exit', (code) => process.exit(code ?? 0));
