import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '../lib/supabase/server';
import { prisma } from '../lib/db';
import SignInForm from '../components/SignInForm';
import AuthHashHandler from '../components/AuthHashHandler';
import { ShieldCheck, Zap, RefreshCw, Smartphone, Loader2 } from 'lucide-react';

export default async function LandingPage() {
  const user = await getSessionUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AuthHashHandler />
      {/* Mini Header */}
      <header className="border-b border-border bg-card/45 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xl shadow-md">
              ₦
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-700 bg-clip-text text-transparent">
              Digital Cheque
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Value Proposition */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground">
                  The Future of Gifting & Payouts
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                  Reserve value for a person first.{' '}
                  <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                    Let them decide where it settles later.
                  </span>
                </h1>
                <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl leading-relaxed">
                  Send money to friends, family, or contractors using only their phone or email. 
                  The recipient verifies their contact and claims the funds directly into their bank account. No signup required for recipients.
                </p>
              </div>

              {/* Benefits list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-primary">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Instant Setup</h3>
                    <p className="text-muted-foreground text-sm">Send in under 60 seconds with simple card checkout.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-primary">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Mobile-Optimized</h3>
                    <p className="text-muted-foreground text-sm">Claim links are built specifically for mobile screens.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-primary">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">High Security OTP</h3>
                    <p className="text-muted-foreground text-sm">Recipients verify their contact using OTP codes.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-primary">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Full Payouts</h3>
                    <p className="text-muted-foreground text-sm">The sender pays processing fees; recipients get 100% of the gift.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Card */}
            <div className="lg:col-span-5 flex justify-center">
              <Suspense fallback={
                <div className="w-full max-w-md p-8 bg-card border border-border rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[300px] space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading authentication form...</p>
                </div>
              }>
                <SignInForm />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-card/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Digital Cheque. Powered by Supabase & Paystack. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
