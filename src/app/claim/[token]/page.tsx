import React from 'react';
import { getChequeByToken } from '../../actions/recipient';
import ClaimOtpForm from '../../../components/ClaimOtpForm';
import { redirect } from 'next/navigation';
import { Ban, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ClaimPage({ params }: PageProps) {
  const { token } = await params;

  try {
    let cheque;
    try {
      cheque = await getChequeByToken(token);
    } catch (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/30 text-destructive">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Cheque Not Found</h2>
            <p className="text-muted-foreground text-sm leading-normal">
              This claim link is invalid, does not exist, or has been revoked by the sender. Please contact the sender to verify.
            </p>
            <Link
              href="/"
              className="inline-block text-sm font-semibold text-primary hover:underline"
            >
              Go to Digital Cheque Homepage
            </Link>
          </div>
        </div>
      );
    }

    // State checks for redirection
    if (cheque.status === 'settled') {
      redirect(`/claim/${token}/success`);
    }

    if (cheque.status === 'recipient_verified' || cheque.status === 'destination_selected') {
      redirect(`/claim/${token}/payout`);
    }

    if (cheque.status === 'cancelled' || cheque.status === 'expired') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/30 text-destructive">
              <Ban className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Cheque {cheque.status === 'cancelled' ? 'Cancelled' : 'Expired'}</h2>
            <p className="text-muted-foreground text-sm leading-normal">
              This digital cheque is no longer active because it was {cheque.status === 'cancelled' ? 'cancelled by the sender' : 'expired past its deadline'}.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Mini Header */}
        <header className="border-b border-border bg-card/45 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4">
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
        <main className="flex-1 flex items-center px-4 py-12">
          <div className="w-full">
            <div className="text-center space-y-2 mb-6">
              <h1 className="text-3xl font-extrabold tracking-tight">Claim Your Digital Cheque</h1>
              <p className="text-muted-foreground text-sm">Securely receive money directly into your bank account.</p>
            </div>

            <ClaimOtpForm token={token} cheque={cheque} />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-6 bg-card/20">
          <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Digital Cheque. Securely powered by Paystack.
          </div>
        </footer>
      </div>
    );
  } catch (error: any) {
    console.error('Claim page crashed:', error);
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-xl border border-border bg-card">
          <h1 className="text-xl font-bold text-red-500 dark:text-red-400">Claim Error</h1>
          <p className="text-sm text-muted-foreground">A database or connection error occurred while loading this page.</p>
          <div className="p-4 bg-muted rounded-lg text-left border border-border">
            <code className="text-xs text-red-500 font-mono break-all block">{error.message || String(error)}</code>
          </div>
          <Link 
            href="/"
            className="block w-full py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-center transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }
}
