import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClientServer() {
  const cookieStore = await cookies();

  return createServerClient(
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
}

export async function getSessionUser() {
  try {
    // Check for offline mock session first
    const cookieStore = await cookies();
    const mockEmail = cookieStore.get('mock-session-email')?.value;
    
    if (mockEmail) {
      const userId = `mock_user_${Buffer.from(mockEmail).toString('base64')}`;
      return {
        id: userId,
        email: mockEmail,
        user_metadata: {
          full_name: mockEmail.split('@')[0],
        },
      } as any;
    }

    const supabaseServer = await createClientServer();
    const { data: { user }, error } = await supabaseServer.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
