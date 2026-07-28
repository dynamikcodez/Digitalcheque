import React from 'react';
import { getSessionUser } from '../../../../lib/supabase/server';
import { prisma } from '../../../../lib/db';
import Navbar from '../../../../components/Navbar';
import FundChequeButton from '../../../../components/FundChequeButton';
import SimulatePaymentButton from '../../../../components/SimulatePaymentButton';
import { redirect } from 'next/navigation';
import { ArrowLeft, Mail, Calendar, HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FundPage({ params }: PageProps) {
  const supabaseUser = await getSessionUser();
  if (!supabaseUser) {
    redirect('/');
  }

  const { id } = await params;

  // Retrieve draft cheque details
  const cheque = await prisma.cheque.findUnique({
    where: { id },
  });

  if (!cheque) {
    redirect('/dashboard');
  }

  // Ensure only the sender can fund it
  if (cheque.senderUserId !== supabaseUser.id) {
    redirect('/dashboard');
  }

  // If already funded, redirect to dashboard or timeline
  if (cheque.status !== 'draft') {
    redirect(`/cheque/${cheque.id}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar userEmail={supabaseUser.email} />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back link */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Cancel & Return
          </Link>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Fund Digital Cheque</h1>
          <p className="text-muted-foreground text-sm">
            Fund the digital cheque to generate and send the claim link to the recipient.
          </p>
        </div>

        {/* Checkout Card */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg space-y-6">
          {/* Summary Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b border-border pb-3">Cheque Summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient Email</span>
                <span className="font-medium flex items-center">
                  <Mail className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  {cheque.recipientEmail}
                </span>
              </div>
              
              {cheque.recipientPhone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient Phone</span>
                  <span className="font-medium">{cheque.recipientPhone}</span>
                </div>
              )}

              {cheque.expiryDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expiry Date</span>
                  <span className="font-medium flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                    {new Date(cheque.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Ledger breakdown */}
          <div className="bg-secondary/45 border border-border/80 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gift Amount</span>
              <span className="font-semibold">₦{cheque.amount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center">
                Processing Fee
                <span className="group relative ml-1 cursor-pointer text-muted-foreground hover:text-foreground">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 p-2 bg-foreground text-background text-3xs rounded shadow-lg z-50 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 leading-normal">
                    This fee covers Squad Co collection, transfer legs, and local transaction taxes.
                  </span>
                </span>
              </span>
              <span className="font-semibold text-muted-foreground">₦{cheque.feeAmount.toLocaleString()}</span>
            </div>

            <div className="border-t border-border/60 pt-3 flex justify-between font-bold text-lg">
              <span>Total Charged</span>
              <span className="text-primary">₦{cheque.totalCharged.toLocaleString()}</span>
            </div>
          </div>

          {/* Fund button */}
          <FundChequeButton chequeId={cheque.id} />

          {/* Dev simulation tool */}
          <SimulatePaymentButton chequeId={cheque.id} />

          <p className="text-center text-3xs text-muted-foreground leading-normal">
            You will be redirected securely to Squad Co to complete the checkout payment.
          </p>
        </div>
      </main>
    </div>
  );
}
