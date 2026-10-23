// Reads a Windows *user* environment variable from the registry (HKCU\Environment) first, so a value
// Michael just changed wins over an older copy this process inherited; other systems use process.env.
// Values stay in memory; nothing is printed or written.
import { execFileSync } from 'node:child_process';

function fromRegistry(name) {
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', name], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const line = out.split(/\r?\n/).find((l) => l.trim().startsWith(name));
    const m = line && /REG_(?:EXPAND_)?SZ\s+(.*)$/.exec(line.trim());
    return m ? m[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

export function userEnv(name) {
  if (process.platform === 'win32') return fromRegistry(name) ?? process.env[name];
  return process.env[name];
}

/** The Supabase project URL without an API path copied by mistake (e.g. ".../rest/v1/"). */
export function supabaseBaseUrl(value) {
  if (!value) return value;
  const u = new URL(value.trim());
  return `${u.protocol}//${u.host}`;
}

/**
 * The database string with the password filled in. Michael may paste Supabase's string unchanged
 * (with [YOUR-PASSWORD]) and keep the password alone in AIGEN_HUB_DEV_DB_PASSWORD; no hand editing.
 */
export function databaseUrl() {
  const raw = userEnv('AIGEN_HUB_DEV_DATABASE_URL');
  const password = userEnv('AIGEN_HUB_DEV_DB_PASSWORD');
  if (!raw) return undefined;
  // The separate password only fills the [YOUR-PASSWORD] gap; a password already in the line always wins.
  if (password && /\[YOUR-PASSWORD\]|%5BYOUR-PASSWORD%5D/i.test(raw)) {
    return raw.replace(/\[YOUR-PASSWORD\]|%5BYOUR-PASSWORD%5D/i, encodeURIComponent(password.trim()));
  }
  return raw.trim();
}

/** The project URL taken from the database string (user "postgres.<project-id>"), so the two always match. */
export function projectUrlFromDatabaseUrl(databaseUrl) {
  try {
    const ref = /^postgres\.([a-z0-9]+)$/.exec(decodeURIComponent(new URL(databaseUrl).username))?.[1];
    return ref ? `https://${ref}.supabase.co` : undefined;
  } catch {
    return undefined;
  }
}
