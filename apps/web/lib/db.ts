import 'server-only';
import { createDb, withClaims, type Claims, type Db, type Tx } from '@hub/db';
import { headers } from 'next/headers';
import { env } from './env';

// One pool per server instance (kept across hot reloads in development).
const g = globalThis as unknown as { __hubDb?: ReturnType<typeof createDb> };

export function getDb(): Db {
  if (!g.__hubDb) g.__hubDb = createDb(env().DATABASE_URL, { max: process.env.VERCEL ? 3 : 10 });
  return g.__hubDb.db;
}

export async function requestMeta() {
  const h = await headers();
  const fwd = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return { ip: fwd || h.get('x-real-ip') || null, userAgent: h.get('user-agent') };
}

/** Run queries as the signed-in user (RLS applies). */
export async function asUser<T>(claims: Claims, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withClaims(getDb(), claims, await requestMeta(), fn);
}

/** Run queries as an anonymous visitor (RLS applies). */
export async function asAnon<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withClaims(getDb(), null, await requestMeta(), fn);
}
