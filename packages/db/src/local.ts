// Local Postgres for development and tests: real Postgres 17 binaries from the embedded-postgres npm package,
// started with pg_ctl so it keeps running in the background. Data lives in hub/.local/ (git-ignored).
// No Docker, no accounts. Production uses Supabase; nothing here runs there.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postgres from 'postgres';

const here = path.dirname(fileURLToPath(import.meta.url));
export const hubRoot = path.resolve(here, '..', '..', '..');
export const LOCAL_PORT = Number(process.env.HUB_LOCAL_PG_PORT ?? 54329);
export const LOCAL_DB = 'hub';
export const localUrl = (db = LOCAL_DB, port = LOCAL_PORT) => `postgres://postgres@127.0.0.1:${port}/${db}`;

type Binaries = { pg_ctl: string; initdb: string; postgres: string };

async function binaries(): Promise<Binaries> {
  // embedded-postgres only exports its main entry; its platform lookup sits next to it in dist/binary.js.
  const main = createRequire(import.meta.url).resolve('embedded-postgres');
  const mod = (await import(pathToFileURL(path.join(path.dirname(main), 'binary.js')).href)) as {
    default: () => Promise<Binaries>;
  };
  return mod.default();
}

// `detached` commands (pg_ctl start) leave postgres holding inherited pipes, so their output is not captured.
function run(cmd: string, args: string[], allowFail = false, detached = false) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    windowsHide: true,
    stdio: detached ? 'ignore' : 'pipe',
  });
  if (r.status !== 0 && !allowFail) {
    throw new Error(`${path.basename(cmd)} ${args.join(' ')} failed:\n${r.stdout}\n${r.stderr}`);
  }
  return r;
}

export function dataDir(name = 'pg') {
  return path.join(hubRoot, '.local', name);
}

export async function isRunning(dir = dataDir()) {
  const { pg_ctl } = await binaries();
  return existsSync(dir) && run(pg_ctl, ['-D', dir, 'status'], true).status === 0;
}

export async function startLocalPostgres(opts: { dir?: string; port?: number } = {}) {
  const dir = opts.dir ?? dataDir();
  const port = opts.port ?? LOCAL_PORT;
  const bin = await binaries();
  if (!existsSync(path.join(dir, 'PG_VERSION'))) {
    mkdirSync(dir, { recursive: true });
    run(bin.initdb, ['-D', dir, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C']);
  }
  if (!(await isRunning(dir))) {
    const log = path.join(path.dirname(dir), `${path.basename(dir)}.log`);
    run(bin.pg_ctl, [
      '-D', dir, '-l', log, '-w', '-t', '60',
      '-o', `-p ${port} -c listen_addresses=127.0.0.1 -c max_connections=60 -c fsync=off`,
      'start',
    ], false, true);
  }
  return { dir, port };
}

export async function stopLocalPostgres(dir = dataDir()) {
  const { pg_ctl } = await binaries();
  if (await isRunning(dir)) run(pg_ctl, ['-D', dir, '-m', 'fast', '-w', 'stop']);
}

export async function destroyLocalPostgres(dir = dataDir()) {
  await stopLocalPostgres(dir);
  rmSync(dir, { recursive: true, force: true });
}

// Creates (or re-creates) a database, applies the Supabase shim and all migrations.
export async function prepareDatabase(db: string, port = LOCAL_PORT, opts: { recreate?: boolean } = {}) {
  const admin = postgres(localUrl('postgres', port), { max: 1, onnotice: () => {} });
  try {
    const exists = await admin`select 1 from pg_database where datname = ${db}`;
    if (exists.length && opts.recreate) await admin.unsafe(`drop database "${db}" with (force)`);
    if (!exists.length || opts.recreate) await admin.unsafe(`create database "${db}"`);
  } finally {
    await admin.end();
  }
  const sql = postgres(localUrl(db, port), { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe(readFileSync(path.join(here, '..', 'local', 'supabase-shim.sql'), 'utf8'));
  } finally {
    await sql.end();
  }
  const { runMigrations } = await import('./migrate.js');
  await runMigrations(localUrl(db, port));
  return localUrl(db, port);
}
