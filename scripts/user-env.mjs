// Reads a Windows *user* environment variable even when this process started before it was set
// (falls back to the registry, HKCU\Environment). Values stay in memory; nothing is printed or written.
import { execFileSync } from 'node:child_process';

export function userEnv(name) {
  if (process.env[name]) return process.env[name];
  if (process.platform !== 'win32') return undefined;
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', name], { encoding: 'utf8', windowsHide: true });
    const line = out.split(/\r?\n/).find((l) => l.trim().startsWith(name));
    const m = line && /REG_(?:EXPAND_)?SZ\s+(.*)$/.exec(line.trim());
    return m ? m[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/** The Supabase project URL without an API path copied by mistake (e.g. ".../rest/v1/"). */
export function supabaseBaseUrl(value) {
  if (!value) return value;
  const u = new URL(value.trim());
  return `${u.protocol}//${u.host}`;
}
