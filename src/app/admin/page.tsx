import React from 'react';
import { getSessionUser } from '../../lib/supabase/server';
import { prisma } from '../../lib/db';
import { redirect } from 'next/navigation';
import Navbar from '../../components/Navbar';
import AdminFeeSettingsForm from '../../components/AdminFeeSettingsForm';
import AdminUserToggle from '../../components/AdminUserToggle';
import AdminChequeActions from '../../components/AdminChequeActions';
import {
  adminGetCheques,
  adminGetRevenueStats,
  adminGetAttentionQueue,
  adminGetWebhookEvents,
  adminGetPlatformSettings,
  adminGetUsers,
} from '../actions/admin';
import {
  LayoutDashboard,
  Coins,
  History,
  AlertOctagon,
  Settings,
  Users,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  CheckCircle,
  Database,
  Search,
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const supabaseUser = await getSessionUser();
  if (!supabaseUser) {
    redirect('/');
  }

  // 1. Verify user is admin in database
  const dbUser = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (!dbUser || dbUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/20 text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground text-sm leading-normal">
            You do not have administrative permissions to access this page.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-10 px-5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Await page query params
  const { tab, status, search } = await searchParams;
  const activeTab = tab || 'revenue';

  // 2. Fetch specific tab dataset
  let tabContent = null;

  switch (activeTab) {
    case 'revenue': {
      const stats = await adminGetRevenueStats();
      tabContent = (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Net Margin (Profit)</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-3xl font-black text-emerald-600 block mt-2">
                ₦{stats.totalMargin.toLocaleString()}
              </span>
              <p className="text-3xs text-muted-foreground mt-1">Platform fee minus actual Paystack collection & transfer costs.</p>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Settled Cheques</span>
                <FileCheck className="w-4 h-4 text-primary" />
              </div>
              <span className="text-3xl font-black text-foreground block mt-2">
                {stats.settledCount}
              </span>
              <p className="text-3xs text-muted-foreground mt-1">Number of digital cheques paid out successfully.</p>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Average Margin</span>
                <Coins className="w-4 h-4 text-primary" />
              </div>
              <span className="text-3xl font-black text-foreground block mt-2">
                ₦{Math.round(stats.averageMargin).toLocaleString()}
              </span>
              <p className="text-3xs text-muted-foreground mt-1">Average platform profit per settled cheque.</p>
            </div>
          </div>

          {/* Negative Margin Alert Area */}
          {stats.negativeMarginsCount > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <AlertOctagon className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-800 dark:text-rose-400">Negative Margin Warning ({stats.negativeMarginsCount})</h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-normal">
                    Some settled cheques resulted in a net loss. This happens when the collected fee did not cover Paystack's combined card collection fee, transfer fee, and stamp duty. Verify your settings below to adjust pricing.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-rose-200 dark:border-rose-900/60 rounded-xl">
                <table className="min-w-full divide-y divide-rose-200 dark:divide-rose-900/40 text-xs text-left">
                  <thead className="bg-rose-100/50 dark:bg-rose-950/40 font-bold text-rose-900 dark:text-rose-300">
                    <tr>
                      <th className="p-3">Cheque ID</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Platform Fee Charged</th>
                      <th className="p-3">Collection Fee (Act)</th>
                      <th className="p-3">Transfer Fee (Act)</th>
                      <th className="p-3">Stamp Duty</th>
                      <th className="p-3">Net Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200 dark:divide-rose-900/40 text-rose-800 dark:text-rose-300">
                    {stats.negativeMarginCheques.map((item) => (
                      <tr key={item.id} className="hover:bg-rose-100/25 dark:hover:bg-rose-950/10">
                        <td className="p-3 font-mono">{item.id.substring(0, 8)}...</td>
                        <td className="p-3">₦{item.amount.toLocaleString()}</td>
                        <td className="p-3">₦{item.feeCharged.toLocaleString()}</td>
                        <td className="p-3">₦{item.collectionFee.toLocaleString()}</td>
                        <td className="p-3">₦{item.transferFee.toLocaleString()}</td>
                        <td className="p-3">₦{item.stampDuty.toLocaleString()}</td>
                        <td className="p-3 font-bold text-destructive">₦{Math.abs(item.netMargin).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Margins Table / History */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg">Daily Revenue Margin Summary</h3>
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="min-w-full divide-y divide-border text-xs text-left">
                <thead className="bg-secondary/45 font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Reconciliation Date</th>
                    <th className="p-3">Cheques Count</th>
                    <th className="p-3">Net Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.chartData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        No Daily statistics available yet.
                      </td>
                    </tr>
                  ) : (
                    stats.chartData.map((row) => (
                      <tr key={row.date} className="hover:bg-secondary/20">
                        <td className="p-3 font-medium">{row.date}</td>
                        <td className="p-3">{row.count}</td>
                        <td className="p-3 font-bold text-emerald-600">₦{row.margin.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
      break;
    }

    case 'cheques': {
      const activeFilter = status || 'all';
      const searchParam = search || '';
      const cheques = await adminGetCheques({
        status: activeFilter,
        search: searchParam,
      });

      tabContent = (
        <div className="space-y-4">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <form className="flex items-center space-x-2 w-full sm:max-w-md">
              <input type="hidden" name="tab" value="cheques" />
              <input type="hidden" name="status" value={activeFilter} />
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  name="search"
                  defaultValue={searchParam}
                  placeholder="Search token, emails, names..."
                  className="flex h-10 w-full rounded-xl border border-input bg-transparent pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                className="h-10 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                Search
              </button>
            </form>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['all', 'draft', 'funded', 'recipient_notified', 'recipient_verified', 'destination_selected', 'settled', 'expired', 'cancelled'].map((val) => (
                <Link
                  key={val}
                  href={`/admin?tab=cheques&status=${val}&search=${encodeURIComponent(searchParam)}`}
                  className={`px-2.5 py-1.5 text-2xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    activeFilter === val
                      ? 'bg-secondary text-primary border border-primary/10'
                      : 'text-muted-foreground hover:bg-secondary/45 hover:text-foreground'
                  }`}
                >
                  {val === 'all' ? 'ALL' : val.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-xs text-left">
                <thead className="bg-secondary/45 font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Cheque ID</th>
                    <th className="p-3">Sender Name</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Total Charged</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Claim Token (8 chars)</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cheques.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground">
                        No cheques match your filter or search query.
                      </td>
                    </tr>
                  ) : (
                    cheques.map((cheque) => (
                      <tr key={cheque.id} className="hover:bg-secondary/20 align-top">
                        <td className="p-3 font-mono">{cheque.id.substring(0, 8)}...</td>
                        <td className="p-3">
                          <p className="font-semibold">{cheque.senderName}</p>
                          <span className="text-3xs text-muted-foreground">{cheque.senderContact}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{cheque.recipientEmail}</span>
                          {cheque.recipientPhone && <p className="text-3xs text-muted-foreground">{cheque.recipientPhone}</p>}
                        </td>
                        <td className="p-3 font-bold">₦{cheque.amount.toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground">₦{cheque.totalCharged.toLocaleString()}</td>
                        <td className="p-3 font-mono text-2xs uppercase font-semibold">{cheque.status}</td>
                        <td className="p-3">
                          <Link
                            href={`/claim/${cheque.claimToken}`}
                            target="_blank"
                            className="font-mono text-primary hover:underline flex items-center"
                          >
                            {cheque.claimToken.substring(0, 8)}...
                            <ArrowUpRight className="w-3 h-3 ml-0.5" />
                          </Link>
                        </td>
                        <td className="p-3 min-w-[200px]">
                          <AdminChequeActions chequeId={cheque.id} status={cheque.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
      break;
    }

    case 'queue': {
      const queue = await adminGetAttentionQueue();

      tabContent = (
        <div className="space-y-6">
          {/* Stuck cheques section */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-border pb-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-lg">Stuck Cheques (&gt;24 Hours Funded/Reserved)</h3>
            </div>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="min-w-full divide-y divide-border text-xs text-left">
                <thead className="bg-secondary/45 font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Cheque ID</th>
                    <th className="p-3">Sender</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queue.stuckCheques.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Clean queue! No cheques are currently stuck.
                      </td>
                    </tr>
                  ) : (
                    queue.stuckCheques.map((cheque) => (
                      <tr key={cheque.id} className="hover:bg-secondary/20">
                        <td className="p-3 font-mono">{cheque.id}</td>
                        <td className="p-3">{cheque.senderContact}</td>
                        <td className="p-3">{cheque.recipientEmail}</td>
                        <td className="p-3 font-bold">₦{cheque.amount.toLocaleString()}</td>
                        <td className="p-3 font-mono text-amber-600">{cheque.status}</td>
                        <td className="p-3">{new Date(cheque.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Failed transfers section */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-border pb-3">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-lg">Failed Payout Transfers (Needs Intervention)</h3>
            </div>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="min-w-full divide-y divide-border text-xs text-left">
                <thead className="bg-secondary/45 font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Transfer ID</th>
                    <th className="p-3">Cheque ID</th>
                    <th className="p-3">Transfer Code</th>
                    <th className="p-3">Payout Amount</th>
                    <th className="p-3">Failure Reason / Status</th>
                    <th className="p-3">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-rose-700 dark:text-rose-400">
                  {queue.failedTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Clean queue! No failed bank payouts registered.
                      </td>
                    </tr>
                  ) : (
                    queue.failedTransfers.map((item) => (
                      <tr key={item.id} className="hover:bg-rose-50/10 dark:hover:bg-rose-950/5">
                        <td className="p-3 font-mono">{item.id.substring(0, 8)}...</td>
                        <td className="p-3 font-mono">{item.chequeId.substring(0, 8)}...</td>
                        <td className="p-3 font-mono font-semibold">{item.paystackTransferCode}</td>
                        <td className="p-3 font-bold">₦{item.amount.toLocaleString()}</td>
                        <td className="p-3 font-mono uppercase font-bold text-destructive">{item.status}</td>
                        <td className="p-3 text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
      break;
    }

    case 'webhooks': {
      const events = await adminGetWebhookEvents();

      tabContent = (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-border pb-3">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Paystack Webhook Event Logs (Last 100)</h3>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="min-w-full divide-y divide-border text-xs text-left">
              <thead className="bg-secondary/45 font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">Event ID</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Received At</th>
                  <th className="p-3">Processed</th>
                  <th className="p-3">Metadata (Ref / Code)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No webhook logs captured yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => {
                    const data = (event.rawPayload as any)?.data || {};
                    const metadata = data.reference || data.transfer_code || 'N/A';
                    return (
                      <tr key={event.id} className="hover:bg-secondary/20">
                        <td className="p-3 font-mono font-medium">{event.id}</td>
                        <td className="p-3 font-mono text-2xs font-semibold">{event.eventType}</td>
                        <td className="p-3 text-muted-foreground">{new Date(event.receivedAt).toLocaleString()}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-semibold border ${
                              event.processed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}
                          >
                            {event.processed ? 'Processed' : 'Unprocessed'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground text-3xs truncate max-w-xs">{metadata}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
      break;
    }

    case 'settings': {
      const settings = await adminGetPlatformSettings();
      tabContent = (
        <AdminFeeSettingsForm
          initialPercentage={settings.feePercentage}
          initialFixed={settings.feeFixed}
        />
      );
      break;
    }

    case 'users': {
      const users = await adminGetUsers();
      tabContent = (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-border pb-3">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">System Users Registry</h3>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="min-w-full divide-y divide-border text-xs text-left">
              <thead className="bg-secondary/45 font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Created At</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/20">
                    <td className="p-3 font-mono">{user.id}</td>
                    <td className="p-3 font-semibold">{user.email}</td>
                    <td className="p-3 font-mono uppercase font-bold text-xs">{user.role}</td>
                    <td className="p-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      {user.id !== dbUser.id ? (
                        <AdminUserToggle userId={user.id} currentRole={user.role} />
                      ) : (
                        <span className="text-3xs text-muted-foreground">(Self)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      break;
    }

    default:
      break;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar userEmail={dbUser.email} userRole={dbUser.role} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground text-sm">Monitor platform revenues, check transaction logs, manage users, and configure settings.</p>
        </div>

        {/* Tab Navigation links */}
        <div className="flex items-center space-x-2 border-b border-border pb-1 overflow-x-auto">
          {[
            { id: 'revenue', label: 'Overview & Revenue', icon: <LayoutDashboard className="w-4 h-4 mr-1.5" /> },
            { id: 'cheques', label: 'All Cheques', icon: <History className="w-4 h-4 mr-1.5" /> },
            { id: 'queue', label: 'Attention Queue', icon: <AlertTriangle className="w-4 h-4 mr-1.5" /> },
            { id: 'webhooks', label: 'Webhook Logs', icon: <Database className="w-4 h-4 mr-1.5" /> },
            { id: 'settings', label: 'Fee Settings', icon: <Settings className="w-4 h-4 mr-1.5" /> },
            { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4 mr-1.5" /> },
          ].map((t) => (
            <Link
              key={t.id}
              href={`/admin?tab=${t.id}`}
              className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-secondary text-primary border border-primary/10 shadow-2xs'
                  : 'text-muted-foreground hover:bg-secondary/45 hover:text-foreground'
              }`}
            >
              {t.icon}
              {t.label}
            </Link>
          ))}
        </div>

        {/* Tab content wrapper */}
        <div className="animate-in fade-in duration-300">{tabContent}</div>
      </main>
    </div>
  );
}
