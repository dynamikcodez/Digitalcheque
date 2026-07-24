'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        // Parse hash parameters
        const params = new URLSearchParams(hash.substring(1)); // strip the leading '#'
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          try {
            console.log('Detected hash access token. Setting session client-side...');
            
            // Set session on the client (createBrowserClient writes the required auth cookies automatically)
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!error) {
              // Successfully authenticated, clear hash and redirect
              window.location.hash = '';
              router.push('/dashboard');
              router.refresh();
            } else {
              console.error('Failed to set session from hash:', error);
            }
          } catch (err) {
            console.error('Error setting session:', err);
          }
        }
      }
    };

    handleHash();
  }, [router]);

  return null;
}
