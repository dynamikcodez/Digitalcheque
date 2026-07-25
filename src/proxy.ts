import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Retrieve user session (checking mock offline session first)
  let user = null;
  const mockEmail = request.cookies.get('mock-session-email')?.value;
  
  if (mockEmail) {
    user = {
      id: `mock_user_${Buffer.from(mockEmail).toString('base64')}`,
      email: mockEmail,
    };
  } else {
    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      user = supabaseUser;
    } catch (err) {
      console.error('Middleware authentication check failed:', err);
    }
  }

  const url = request.nextUrl.clone();

  // Protect sender/admin specific paths
  const protectedPrefixes = ['/create', '/dashboard', '/admin', '/cheque'];
  const isProtected = protectedPrefixes.some((prefix) => url.pathname.startsWith(prefix));

  if (isProtected && !user) {
    url.pathname = '/';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Apply middleware to all routes except assets, images, and static resources
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
