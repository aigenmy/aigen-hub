import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Runs before every page: passes the current path to layouts (for "next" redirects) and, in Supabase mode,
// refreshes the sign-in session cookies. Access control itself happens in the layouts and in the database.
export async function proxy(request: NextRequest) {
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set('x-hub-path', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.next({ request: { headers } });
  };
  let response = forward();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (process.env.AUTH_MODE !== 'local' && url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = forward();
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    });
    await supabase.auth.getClaims();
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|aigen-logo.png|api/health).*)'],
};
