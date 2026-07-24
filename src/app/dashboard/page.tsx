import React from 'react';
import { getSessionUser } from '../../lib/supabase/server';
import { ensureUserExists } from '../../lib/user-sync';
import { prisma } from '../../lib/db';
import { senderGetCheques } from '../actions/sender';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { Plus, ArrowRight, Calendar, Mail, FileText, CheckCircle, RefreshCw, Clock, Ban, Smartphone } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabaseUser = await getSessionUser();
  if (!supabaseUser) {
    redirect('/');
  }

  // Ensure user is synced
  const dbUser = await ensureUserExists(supabaseUser);
  
  // Read and await search parameters
  const { status } = await searchParams;
  const activeFilter = status || 'all';

  // Fetch cheques using Server Action logic
  const cheques = await senderGetCheques(activeFilter);

  // Calculate statistics across all user cheques
  const allUserCheques = await prisma.cheque.findMany({
    where: { senderUserId: dbUser.id },
  });

  const stats = {
    totalSent: allUserCheques.reduce((sum, c) => sum + c.amount, 0),
    activeCount: allUserCheques.filter(c => ['funded', 'reserved', 'recipient_notified', 'recipient_verified', 'destination_selected'].includes(c.status)).length,
    settledCount: allUserCheques.filter(c => c.status === 'settled').length,
    draftCount: allUserCheques.filter(c => c.status === 'draft').length,
  };

  const getStatusStyle = (statusStr: string) => {
    switch (statusStr) {
      case 'settled':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200';
      case 'cancelled':
      case 'expired':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200';
      case 'recipient_notified':
      case 'recipient_verified':
      case 'destination_selected':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200';
    }
  };

  const getStatusIcon = (statusStr: string) => {
    switch (statusStr) {
      case 'settled':
        return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
      case 'draft':
        return <FileText className="w-3.5 h-3.5 mr-1" />;
      case 'cancelled':
      case 'expired':
        return <Ban className="w-3.5 h-3.5 mr-1" />;
      default:
        return <Clock className="w-3.5 h-3.5 mr-1 animate-pulse" />;
    }
  };

  const formatStatusLabel = (statusStr: string) => {
    return statusStr.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar userEmail={dbUser.email} userRole={dbUser.role} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Digital Cheques</h1>
            <p className="text-muted-foreground text-sm">Create, manage, and track your sent payments in real-time.</p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Send New Cheque
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Value Sent</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold">₦{stats.totalSent.toLocaleString()}</span>
              <span className="text-xs text-primary font-medium">NGN</span>
            </div>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Cheques</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold">{stats.activeCount}</span>
              <span className="text-xs text-amber-600 font-medium">Claim Pending</span>
            </div>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settled Cheques</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold">{stats.settledCount}</span>
              <span className="text-xs text-emerald-600 font-medium">Completed</span>
            </div>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drafts</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold">{stats.draftCount}</span>
              <span className="text-xs text-muted-foreground font-medium">Unfunded</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 border-b border-border pb-1 overflow-x-auto">
          {['all', 'draft', 'funded', 'recipient_notified', 'recipient_verified', 'destination_selected', 'settled', 'expired', 'cancelled'].map((filterVal) => (
            <Link
              key={filterVal}
              href={`/dashboard?status=${filterVal}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === filterVal
                  ? 'bg-secondary text-primary border border-primary/10'
                  : 'text-muted-foreground hover:bg-secondary/45 hover:text-foreground'
              }`}
            >
              {filterVal === 'all' ? 'ALL CHEQUES' : formatStatusLabel(filterVal)}
            </Link>
          ))}
        </div>

        {/* Cheques List */}
        {cheques.length === 0 ? (
          <div className="text-center py-16 bg-card/45 border border-dashed border-border rounded-2xl">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-lg">No cheques found</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
              {activeFilter === 'all'
                ? "You haven't created any Digital Cheques yet. Click the button above to get started!"
                : `No cheques match the status filter: ${formatStatusLabel(activeFilter)}`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cheques.map((cheque) => (
              <div
                key={cheque.id}
                className="group relative bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">₦{cheque.amount.toLocaleString()}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-semibold border ${getStatusStyle(cheque.status)}`}>
                      {getStatusIcon(cheque.status)}
                      {formatStatusLabel(cheque.status)}
                    </span>
                  </div>

                  {/* Recipient Details */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 mr-2 shrink-0" />
                      <span className="truncate">{cheque.recipientEmail}</span>
                    </div>
                    {cheque.recipientPhone && (
                      <div className="flex items-center text-muted-foreground">
                        <Smartphone className="w-3.5 h-3.5 mr-2 shrink-0" />
                        <span>{cheque.recipientPhone}</span>
                      </div>
                    )}
                    {cheque.expiryDate && (
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                        <span>Expires {new Date(cheque.expiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  {cheque.message && (
                    <p className="text-xs text-muted-foreground bg-secondary/50 p-2.5 rounded-xl line-clamp-2 italic">
                      "{cheque.message}"
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-3xs text-muted-foreground">
                    Created {new Date(cheque.createdAt).toLocaleDateString()}
                  </span>
                  
                  {cheque.status === 'draft' ? (
                    <Link
                      href={`/create/${cheque.id}/fund`}
                      className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                    >
                      Fund Cheque
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  ) : (
                    <Link
                      href={`/cheque/${cheque.id}`}
                      className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                    >
                      View Timeline
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Redirect helper
import { redirect } from 'next/navigation';
