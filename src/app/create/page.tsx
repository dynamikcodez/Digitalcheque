import React from 'react';
import { getSessionUser } from '../../lib/supabase/server';
import { prisma } from '../../lib/db';
import CreateChequeForm from '../../components/CreateChequeForm';
import Navbar from '../../components/Navbar';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function CreatePage() {
  const supabaseUser = await getSessionUser();
  if (!supabaseUser) {
    redirect('/');
  }

  // Get user role
  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (!dbUser) {
    redirect('/');
  }

  // Get current global platform settings
  let settings = await prisma.platformSettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = {
      id: 'default',
      feePercentage: 3.0,
      feeFixed: 200.0,
      currencyDefault: 'NGN',
      updatedAt: new Date(),
    };
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar userEmail={dbUser.email} userRole={dbUser.role} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Send a Digital Cheque</h1>
          <p className="text-muted-foreground text-sm">
            Enter the details of your payout. We'll compute the processing fee and generate a claim link.
          </p>
        </div>

        {/* Form Component */}
        <CreateChequeForm
          feePercentage={settings.feePercentage}
          feeFixed={settings.feeFixed}
        />
      </main>
    </div>
  );
}
