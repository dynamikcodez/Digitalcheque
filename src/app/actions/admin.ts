'use server';

import { prisma } from '../../lib/db';
import { getSessionUser } from '../../lib/supabase/server';
import { emailService } from '../../lib/resend';
import { revalidatePath } from 'next/cache';

/**
 * Helper to assert admin authorization.
 * Throws an error if the user is not authenticated or does not have role='admin'.
 */
async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Authentication required');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser || dbUser.role !== 'admin') {
    throw new Error('Unauthorized - Admin access required');
  }

  return dbUser;
}

/**
 * Fetch all cheques with filtering, sorting, and search for claim token.
 */
export async function adminGetCheques(filters: {
  status?: string;
  sender?: string;
  search?: string;
}) {
  await requireAdmin();

  const where: any = {};

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status;
  }

  if (filters.sender) {
    where.senderContact = {
      contains: filters.sender,
      mode: 'insensitive',
    };
  }

  if (filters.search) {
    where.OR = [
      { id: { contains: filters.search } },
      { claimToken: { contains: filters.search } },
      { recipientEmail: { contains: filters.search, mode: 'insensitive' } },
      { senderName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.cheque.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      ledger: true,
      transfers: true,
    },
  });
}

/**
 * Fetch stats for the revenue dashboard based on transactions_ledger.
 */
export async function adminGetRevenueStats() {
  await requireAdmin();

  // Find all ledger rows for settled cheques
  const settledCheques = await prisma.cheque.findMany({
    where: { status: 'settled' },
    include: { ledger: true },
  });

  let totalMargin = 0;
  let settledCount = 0;
  let negativeMarginsCount = 0;
  const negativeMarginCheques: any[] = [];

  settledCheques.forEach((cheque) => {
    const ledger = cheque.ledger[0];
    if (ledger && ledger.reconciledAt) {
      const margin = ledger.platformNetMargin || 0;
      totalMargin += margin;
      settledCount++;

      if (margin < 0) {
        negativeMarginsCount++;
        negativeMarginCheques.push({
          id: cheque.id,
          amount: cheque.amount,
          feeCharged: cheque.feeAmount,
          netMargin: margin,
          collectionFee: ledger.paystackCollectionFeeActual,
          transferFee: ledger.paystackTransferFeeActual,
          stampDuty: ledger.stampDutyActual,
        });
      }
    }
  });

  const averageMargin = settledCount > 0 ? totalMargin / settledCount : 0;

  // Chart data: Group margins by date
  const settledLedgers = await prisma.transactionsLedger.findMany({
    where: {
      reconciledAt: { not: null },
      cheque: { status: 'settled' },
    },
    orderBy: { reconciledAt: 'asc' },
    include: { cheque: true },
  });

  const dailyStats: Record<string, { date: string; margin: number; count: number }> = {};
  settledLedgers.forEach((ledger) => {
    const dateStr = ledger.reconciledAt!.toISOString().split('T')[0];
    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = { date: dateStr, margin: 0, count: 0 };
    }
    dailyStats[dateStr].margin += ledger.platformNetMargin || 0;
    dailyStats[dateStr].count += 1;
  });

  return {
    totalMargin,
    settledCount,
    averageMargin,
    negativeMarginsCount,
    negativeMarginCheques,
    chartData: Object.values(dailyStats),
  };
}

/**
 * Fetch the attention queue:
 * 1. Cheques stuck in status funded or reserved past 24 hours.
 * 2. Payout transfers in status failed.
 */
export async function adminGetAttentionQueue() {
  await requireAdmin();

  // Threshold: 24 hours ago
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Stuck cheques
  const stuckCheques = await prisma.cheque.findMany({
    where: {
      status: { in: ['funded', 'reserved'] },
      createdAt: { lt: threshold },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Failed transfers
  const failedTransfers = await prisma.transfer.findMany({
    where: { status: 'failed' },
    orderBy: { createdAt: 'desc' },
    include: { cheque: true },
  });

  return {
    stuckCheques,
    failedTransfers,
  };
}

/**
 * Fetch processed and unprocessed webhook events.
 */
export async function adminGetWebhookEvents() {
  await requireAdmin();
  return prisma.webhookEvent.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 100, // limit to latest 100
  });
}

/**
 * Fetch the current global platform settings.
 */
export async function adminGetPlatformSettings() {
  await requireAdmin();
  let settings = await prisma.platformSettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: {
        id: 'default',
        feePercentage: 3.0,
        feeFixed: 200.0,
      },
    });
  }

  return settings;
}

/**
 * Updates the global fee percentage and fixed fee amount.
 */
export async function adminUpdatePlatformSettings(data: {
  feePercentage: number;
  feeFixed: number;
}) {
  await requireAdmin();

  const settings = await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {
      feePercentage: data.feePercentage,
      feeFixed: data.feeFixed,
    },
    create: {
      id: 'default',
      feePercentage: data.feePercentage,
      feeFixed: data.feeFixed,
    },
  });

  revalidatePath('/admin');
  return settings;
}

/**
 * Lists all registered users.
 */
export async function adminGetUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Promote or demote a user's role.
 */
export async function adminToggleUserRole(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const nextRole = user.role === 'admin' ? 'user' : 'admin';

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
  });

  revalidatePath('/admin/users');
  return updatedUser;
}

/**
 * Manually marks a cheque as expired.
 */
export async function adminMarkChequeExpired(chequeId: string) {
  await requireAdmin();

  const cheque = await prisma.cheque.findUnique({
    where: { id: chequeId },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  if (cheque.status === 'settled') {
    throw new Error('Cannot expire settled cheque');
  }

  const updatedCheque = await prisma.cheque.update({
    where: { id: chequeId },
    data: { status: 'expired' },
  });

  revalidatePath('/admin');
  return updatedCheque;
}

/**
 * Re-sends the claim link email notifications to the recipient.
 */
export async function adminResendClaimNotification(chequeId: string) {
  await requireAdmin();

  const cheque = await prisma.cheque.findUnique({
    where: { id: chequeId },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  if (cheque.status === 'draft') {
    throw new Error('Cannot notify recipient of an unfunded draft cheque');
  }

  const success = await emailService.sendClaimLink(
    cheque.id,
    cheque.recipientEmail,
    cheque.senderName,
    cheque.amount,
    cheque.message || '',
    cheque.claimToken
  );

  if (!success) {
    throw new Error('Failed to send email via Resend');
  }

  return { success: true };
}

/**
 * Retrieves the cheque history for a specific user ID (for admin auditing).
 */
export async function adminGetUserCheques(userId: string) {
  await requireAdmin();
  return prisma.cheque.findMany({
    where: { senderUserId: userId },
    orderBy: { createdAt: 'desc' },
  });
}
