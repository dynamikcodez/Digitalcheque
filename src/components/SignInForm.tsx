'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { Mail, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const isMockMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      if (isMockMode) {
        // Simulate sending mail offline, bypass network call
        setSuccess(true);
        return;
      }

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMsg(err.message || 'An error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-card text-card-foreground border border-border rounded-2xl shadow-xl">
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Welcome to Digital Cheque</h2>
        <p className="text-muted-foreground text-sm">
          Enter your email to sign in or create an account via a magic link.
        </p>
      </div>

      {success ? (
        <div className="bg-accent/40 border border-primary/20 rounded-xl p-6 text-center space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{isMockMode ? 'Offline Testing Mode' : 'Check your email'}</h3>
            <p className="text-muted-foreground text-sm">
              {isMockMode
                ? 'A mock magic link has been generated. Click the button below to sign in instantly.'
                : `We sent a secure magic link to ${email}. Click the link to log in instantly.`}
            </p>
          </div>

          {isMockMode && (
            <div className="pt-2">
              <a
                href={`/auth/callback?code=mock_code_for_${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`}
                className="flex items-center justify-center w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
              >
                Log In as {email}
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </div>
          )}
          <button
            onClick={() => setSuccess(false)}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Use a different email address
          </button>
        </div>
      ) : (
        <form onSubmit={handleSignIn} className="space-y-4">
          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="flex h-11 w-full rounded-xl border border-input bg-transparent px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending magic link...
              </>
            ) : (
              <>
                Send Magic Link
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
