import 'server-only';
import { z } from 'zod';

// Server environment. Values come from Vercel env (production/preview) or, on Michael's PC, from the
// launchers: dev-local (local mode) or dev-supabase (Windows user environment variables AIGEN_HUB_DEV_*). Never from a file.
const schema = z.object({
  AUTH_MODE: z.enum(['supabase', 'local']).default('supabase'),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  // 'on' once the Google OAuth client is set in Supabase (Authentication > Providers > Google).
  GOOGLE_SIGN_IN: z.enum(['on', 'off']).default('off'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`AIGen Hub: missing or invalid environment: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  const e = parsed.data;
  if (e.AUTH_MODE === 'local') {
    // Local sign-in exists only for the developer's own PC: never on Vercel, never against a remote database.
    const host = new URL(e.DATABASE_URL).hostname;
    if (process.env.VERCEL || !['127.0.0.1', 'localhost', '::1'].includes(host)) {
      throw new Error('AUTH_MODE=local is only allowed with a database on this computer.');
    }
  } else if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('AIGen Hub: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.');
  }
  cached = e;
  return e;
}

export const isLocalMode = () => env().AUTH_MODE === 'local';
