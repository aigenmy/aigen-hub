// Database access. Every user request runs inside withClaims(): a transaction that sets the verified JWT claims
// and switches to the `authenticated` role, so RLS applies exactly as it would through the Supabase API (spec §9.1).
// adminDb (no role switch) is for jobs, webhooks and scripts only, and must always filter by company_id itself.
import { isIP } from 'node:net';
import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type Claims = {
  sub: string;
  role?: string;
  aal?: 'aal1' | 'aal2';
  email?: string;
  session_id?: string;
  [key: string]: unknown;
};

export type RequestMeta = { ip?: string | null; userAgent?: string | null; impersonating?: string | null };

export function createDb(url: string, opts: { max?: number } = {}) {
  // prepare:false is required behind Supabase's transaction pooler (port 6543).
  const client = postgres(url, { max: opts.max ?? 10, prepare: false, onnotice: () => {} });
  return { db: drizzle(client, { schema }), client };
}

export async function withClaims<T>(
  db: Db,
  claims: Claims | null,
  meta: RequestMeta,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const ip = meta.ip && isIP(meta.ip) ? meta.ip : '';
  const ua = (meta.userAgent ?? '').slice(0, 400);
  const jwt = claims ? JSON.stringify({ role: 'authenticated', aal: 'aal1', ...claims }) : '';
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claims', ${jwt}, true),
                                set_config('hub.ip', ${ip}, true),
                                set_config('hub.user_agent', ${ua}, true),
                                set_config('hub.impersonating', ${meta.impersonating ?? ''}, true)`);
    await tx.execute(sql.raw(claims ? 'set local role authenticated' : 'set local role anon'));
    return fn(tx);
  });
}

// Errors raised by the rules layer carry 'hub:<code>'; this finds the code through driver wrappers.
export function hubErrorCode(error: unknown): string | null {
  let e: unknown = error;
  for (let i = 0; i < 5 && e; i++) {
    const msg = (e as { message?: string }).message ?? '';
    const m = /hub:([a-z_]+)/.exec(msg);
    if (m?.[1]) return m[1];
    if ((e as { code?: string }).code === '42501') return 'forbidden';
    e = (e as { cause?: unknown }).cause;
  }
  return null;
}
