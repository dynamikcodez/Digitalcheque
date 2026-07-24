'use client';

import React from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase/client';
import { LogOut, Shield, History, PlusCircle, CheckSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOutAction } from '../app/actions/auth';

interface NavbarProps {
  userEmail?: string;
  userRole?: string;
}

export default function Navbar({ userEmail, userRole }: NavbarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutAction();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  };

  const isAdmin = userRole === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xl shadow-md">
              ₦
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-700 bg-clip-text text-transparent">
              Digital Cheque
            </span>
          </Link>
        </div>

        {/* Navigation / Actions */}
        {userEmail ? (
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/dashboard"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
              >
                <History className="w-4 h-4 mr-1.5 text-muted-foreground" />
                History
              </Link>
              <Link
                href="/create"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
              >
                <PlusCircle className="w-4 h-4 mr-1.5 text-muted-foreground" />
                New Cheque
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center px-3 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg hover:opacity-90 transition-colors"
                >
                  <Shield className="w-4 h-4 mr-1.5" />
                  Admin
                </Link>
              )}
            </nav>

            <span className="hidden sm:inline-block text-xs text-muted-foreground border-l border-border pl-4">
              {userEmail}
            </span>

            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
