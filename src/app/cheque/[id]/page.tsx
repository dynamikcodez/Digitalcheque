import React from 'react';
import { getSessionUser } from '../../../lib/supabase/server';
import { prisma } from '../../../lib/db';
import Navbar from '../../../components/Navbar';
import CancelChequeButton from '../../../components/CancelChequeButton';
import { redirect } from 'next/navigation';
import { ArrowLeft, Clock, Check, Ban, AlertTriangle, ExternalLink, Calendar, Mail, FileText, Send } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChequeTimelinePage({ params }: PageProps) {
  const supabaseUser = await getSessionUser();
  if (!supabaseUser) {
    redirect('/');
  }

  const { id } = await params;

  // Retrieve cheque with transfers and payout destination details
  const cheque = await prisma.cheque.findUnique({
    where: { id },
    include: {
      transfers: true,
      payoutDestinations: true,
    },
  });

  if (!cheque) {
    redirect('/dashboard');
  }

  // Authorize: only sender or admin can view this timeline
  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (!dbUser || (cheque.senderUserId !== dbUser.id && dbUser.role !== 'admin')) {
    redirect('/dashboard');
  }

  // Map state machine states to visual timeline steps
  const steps = [
    { label: 'Cheque Created', desc: 'Draft details entered by sender.', key: 'draft' },
    { label: 'Funded & Reserved', desc: 'Funds successfully escrowed via Paystack.', key: 'funded' },
    { label: 'Recipient Notified', desc: 'Claim link sent to recipient email.', key: 'recipient_notified' },
    { label: 'Recipient Identity Verified', desc: 'Recipient verified their email via OTP.', key: 'recipient_verified' },
    { label: 'Bank Payout Selected', desc: 'Recipient resolved bank account and created transfer.', key: 'destination_selected' },
    { label: 'Settled & Completed', desc: 'Payout transfer successfully processed.', key: 'settled' },
  ];

  // Helper to determine the status of each step: 'completed' | 'active' | 'pending' | 'cancelled' | 'expired'
  const getStepStatus = (stepKey: string) => {
    if (cheque.status === 'cancelled') return 'cancelled';
    if (cheque.status === 'expired') return 'expired';

    const stateOrder = ['draft', 'funded', 'recipient_notified', 'recipient_verified', 'destination_selected', 'settled'];
    
    // Treat 'reserved' as synonymous with 'funded' for order resolution
    let currentStatus = cheque.status;
    if (currentStatus === 'reserved') {
      currentStatus = 'funded';
    }

    const currentIndex = stateOrder.indexOf(currentStatus);
    const stepIndex = stateOrder.indexOf(stepKey === 'funded' ? 'funded' : stepKey);

    if (stepIndex < currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="w-4 h-4" />
          </div>
        );
      case 'active':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-sm animate-pulse">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/30 text-destructive">
            <Ban className="w-4 h-4" />
          </div>
        );
      case 'expired':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/35" />
          </div>
        );
    }
  };

  const activeTransfer = cheque.transfers.find(t => t.status === 'pending') || cheque.transfers[0];
  const activePayout = cheque.payoutDestinations[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar userEmail={supabaseUser.email} userRole={dbUser.role} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        {/* Timeline Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Visual state steps timeline (Left column) */}
          <div className="lg:col-span-7 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-xl font-bold border-b border-border pb-4">Transfer Lifecycle</h2>

            <div className="relative pl-6 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {steps.map((step) => {
                const status = getStepStatus(step.key);
                return (
                  <div key={step.key} className="relative flex items-start space-x-4">
                    {/* Circle icon */}
                    <div className="absolute -left-10 top-0 z-10 bg-card py-1">
                      {getStepIcon(status)}
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                      <h3
                        className={`text-sm font-semibold leading-none ${
                          status === 'completed'
                            ? 'text-primary'
                            : status === 'active'
                            ? 'text-foreground font-bold'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-normal">{step.desc}</p>

                      {/* Display metadata inline inside timeline steps */}
                      {step.key === 'funded' && cheque.fundedAt && (
                        <span className="inline-block text-3xs text-muted-foreground bg-secondary px-2 py-0.5 rounded mt-1">
                          Funded on {new Date(cheque.fundedAt).toLocaleString()}
                        </span>
                      )}
                      {step.key === 'recipient_notified' && cheque.status !== 'draft' && (
                        <span className="inline-block text-3xs text-muted-foreground bg-secondary px-2 py-0.5 rounded mt-1">
                          Link: {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/claim/{cheque.claimToken.substring(0, 8)}...
                        </span>
                      )}
                      {step.key === 'recipient_verified' && cheque.claimedAt && (
                        <span className="inline-block text-3xs text-muted-foreground bg-secondary px-2 py-0.5 rounded mt-1">
                          Verified on {new Date(cheque.claimedAt).toLocaleString()}
                        </span>
                      )}
                      {step.key === 'destination_selected' && activePayout && (
                        <div className="text-3xs text-muted-foreground bg-secondary p-2 rounded-xl mt-1.5 space-y-1">
                          <div><strong>Bank:</strong> {activePayout.bankCode}</div>
                          <div><strong>Account:</strong> {activePayout.accountNumber} ({activePayout.accountName})</div>
                        </div>
                      )}
                      {step.key === 'settled' && cheque.settledAt && (
                        <span className="inline-block text-3xs text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded mt-1 font-semibold">
                          Settled on {new Date(cheque.settledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details & Actions Card (Right column) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Cheque info */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-lg border-b border-border pb-3">Cheque Details</h3>

              <div className="space-y-3.5 text-sm">
                <div>
                  <span className="text-3xs text-muted-foreground uppercase block font-semibold">Gift Amount</span>
                  <span className="text-2xl font-black text-primary">₦{cheque.amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-3xs text-muted-foreground uppercase block font-semibold">Total Cost (incl. fees)</span>
                  <span className="font-semibold text-muted-foreground">₦{cheque.totalCharged.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-3xs text-muted-foreground uppercase block font-semibold">Recipient</span>
                  <span className="font-medium text-foreground flex items-center mt-0.5">
                    <Mail className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                    {cheque.recipientEmail}
                  </span>
                </div>
                {cheque.expiryDate && (
                  <div>
                    <span className="text-3xs text-muted-foreground uppercase block font-semibold">Expiry Date</span>
                    <span className="font-medium text-foreground flex items-center mt-0.5">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                      {new Date(cheque.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {cheque.message && (
                  <div>
                    <span className="text-3xs text-muted-foreground uppercase block font-semibold">Message</span>
                    <span className="text-xs italic text-muted-foreground block bg-secondary/45 p-2 rounded-xl mt-1">
                      "{cheque.message}"
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payout & Transfer processing details */}
            {activeTransfer && (
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-lg border-b border-border pb-3">Paystack Transfer Payout</h3>
                <div className="space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Transfer Code</span>
                    <span className="font-mono text-foreground">{activeTransfer.paystackTransferCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transfer Status</span>
                    <span className={`font-semibold uppercase ${activeTransfer.status === 'success' ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {activeTransfer.status}
                    </span>
                  </div>
                  {activeTransfer.completedAt && (
                    <div className="flex justify-between">
                      <span>Completed At</span>
                      <span className="text-foreground">{new Date(activeTransfer.completedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Bar */}
            {['draft', 'recipient_notified'].includes(cheque.status) && (
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-sm">Actions</h3>
                <div className="flex flex-col space-y-2">
                  {cheque.status === 'draft' && (
                    <Link
                      href={`/create/${cheque.id}/fund`}
                      className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                    >
                      <Send className="w-4 h-4 mr-1.5" />
                      Fund & Notify Recipient
                    </Link>
                  )}
                  {/* Sender can cancel cheque before it gets verified/settled */}
                  <CancelChequeButton chequeId={cheque.id} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
