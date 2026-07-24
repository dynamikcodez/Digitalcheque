import React from 'react';
import { getChequeByToken } from '../../../actions/recipient';
import { prisma } from '../../../../lib/db';
import { redirect } from 'next/navigation';
import { CheckCircle2, ArrowRight, Building, HelpCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ClaimSuccessPage({ params }: PageProps) {
  const { token } = await params;

  let cheque;
  try {
    cheque = await getChequeByToken(token);
  } catch (error) {
    redirect('/');
  }

  // Redirect to claim start if not processed yet
  if (cheque.status === 'draft' || cheque.status === 'recipient_notified') {
    redirect(`/claim/${token}`);
  }

  // Load payout destination details from db
  const payout = await prisma.payoutDestination.findFirst({
    where: { chequeId: cheque.id },
  });

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
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          {/* Check icon */}
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Claim Completed!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your digital cheque worth <strong className="text-primary text-base">₦{cheque.amount.toLocaleString()}</strong> has been successfully claimed.
            </p>
          </div>

          {/* Payout Summary Info Card */}
          {payout && (
            <div className="bg-card border border-border p-5 rounded-2xl shadow-md text-left space-y-3.5">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                Settlement Details
              </h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground text-xs">Destination Bank</span>
                  <span className="font-semibold flex items-center text-right max-w-[200px] truncate">
                    <Building className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                    {payout.bankCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Account Number</span>
                  <span className="font-semibold font-mono">{payout.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Account Name</span>
                  <span className="font-semibold text-right max-w-[200px] truncate">{payout.accountName}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2.5">
                  <span className="text-muted-foreground text-xs">Processing State</span>
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-600 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Settled
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <p className="text-3xs text-muted-foreground leading-normal max-w-xs mx-auto mb-4">
              We have automatically notified the sender that you have claimed these funds. Thank you for using Digital Cheque.
            </p>

            <Link
              href="/"
              className="inline-flex items-center justify-center h-10 px-5 bg-secondary hover:bg-muted text-foreground font-semibold text-sm rounded-xl transition-all"
            >
              Go to Homepage
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
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
}
