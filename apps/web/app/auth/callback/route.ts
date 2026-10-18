import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/auth/supabase';
import { env } from '@/lib/env';
import { safeNext } from '@/lib/safe-next';

// Landing point for Google sign-in, email links (sign-in, confirmation) and password-reset links (Supabase PKCE).
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = safeNext(req.nextUrl.searchParams.get('next'));
  const base = env().APP_URL;
  if (code && env().AUTH_MODE === 'supabase') {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, base));
  }
  // Usually: the link was opened in another browser than the one used to sign up. The email is confirmed anyway.
  return NextResponse.redirect(new URL('/login?error=auth_link', base));
}
