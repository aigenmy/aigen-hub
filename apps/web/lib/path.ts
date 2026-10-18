import 'server-only';
import { headers } from 'next/headers';
import { safeNext } from './safe-next';

/** The path of the current request (set by proxy.ts), for "come back here after sign-in" links. */
export async function currentPath(fallback = '/home') {
  return safeNext((await headers()).get('x-hub-path'), fallback);
}
