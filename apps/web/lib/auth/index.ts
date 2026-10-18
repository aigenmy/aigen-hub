import 'server-only';
import { env } from '../env';
import { localAuth } from './local';
import { supabaseAuth } from './supabase';
import type { AuthAdapter } from './types';

export type { AuthAdapter, AuthResult, Enrollment, Factor } from './types';

export function auth(): AuthAdapter {
  return env().AUTH_MODE === 'local' ? localAuth : supabaseAuth;
}
