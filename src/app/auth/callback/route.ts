import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ensureUserExists } from '../../../lib/user-sync';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();

    // Check if it is a mock code for offline sign-in bypass
    if (code.startsWith('mock_code_for_')) {
      const email = decodeURIComponent(code.replace('mock_code_for_', ''));
      const userId = `mock_user_${Buffer.from(email).toString('base64')}`;

      // Set cookie
      cookieStore.set('mock-session-email', email, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
      });

      // Sync user to database
      await ensureUserExists({
        id: userId,
        email,
        user_metadata: {
          full_name: email.split('@')[0],
        },
      } as any);

      return NextResponse.redirect(`${origin}${next}`);
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored when called from Server Components during page render
            }
          },
        },
      }
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            await ensureUserExists(user);
          } catch (dbError: any) {
            console.error('Database user sync failed:', dbError);
            return NextResponse.redirect(`${origin}?error=Database sync error: ${encodeURIComponent(dbError.message || 'unknown')}`);
          }
        }
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        console.error('Auth code exchange failed:', error);
      }
    } catch (err: any) {
      console.error('Unhandled callback error:', err);
      return NextResponse.redirect(`${origin}?error=Unhandled auth error: ${encodeURIComponent(err.message || 'unknown')}`);
    }
  }

  return NextResponse.redirect(`${origin}?error=Could not authenticate user`);
}
