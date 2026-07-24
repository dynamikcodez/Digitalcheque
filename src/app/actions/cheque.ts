'use server';

import { prisma } from '../../lib/db';
import { getSessionUser } from '../../lib/supabase/server';
import {
  calculatePlatformFee,
  estimatePaystackCollectionFee,
  estimatePaystackTransferFee,
  estimateStampDuty,
} from '../../lib/fees';
import { paystack } from '../../lib/paystack';
import { redirect } from 'next/navigation';

export interface CreateChequeInput {
  amount: number;
  recipientEmail: string;
  recipientPhone?: string;
  message?: string;
  expiryDate?: string;
}

/**
 * Creates a new Digital Cheque in status=draft and writes the estimates into transactions_ledger
 */
export async function createCheque(input: CreateChequeInput) {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('You must be signed in to create a cheque');
  }

  // 1. Fetch current platform settings
  let settings = await prisma.platformSettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    // Fallback if seeder hasn't run yet
    settings = {
      id: 'default',
      feePercentage: 3.0,
      feeFixed: 200.0,
      currencyDefault: 'NGN',
      updatedAt: new Date(),
    };
  }

  // 2. Calculate platform fees
  const { feeAmount, totalCharged } = calculatePlatformFee(
    input.amount,
    settings.feePercentage,
    settings.feeFixed
  );

  // 3. Pre-compute Paystack estimates for transactions_ledger
  const collectionFeeEst = estimatePaystackCollectionFee(totalCharged);
  const transferFeeEst = estimatePaystackTransferFee(input.amount);
  const stampDutyEst = estimateStampDuty(input.amount);

  // 4. Create cheque and ledger entry inside a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the Cheque
    const cheque = await tx.cheque.create({
      data: {
        senderUserId: user.id,
        senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Sender',
        senderContact: user.email || '',
        recipientEmail: input.recipientEmail,
        recipientPhone: input.recipientPhone || null,
        amount: input.amount,
        currency: settings.currencyDefault,
        feeAmount: feeAmount,
        feePercentageApplied: settings.feePercentage,
        feeFixedApplied: settings.feeFixed,
        totalCharged: totalCharged,
        message: input.message || null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        status: 'draft',
      },
    });

    // Create the initial Ledger Estimate row
    await tx.transactionsLedger.create({
      data: {
        chequeId: cheque.id,
        paystackCollectionFeeEstimate: collectionFeeEst,
        paystackTransferFeeEstimate: transferFeeEst,
        platformFeeCollected: feeAmount,
      },
    });

    return cheque;
  });

  return result;
}

/**
 * Initializes Paystack Transaction for the total_charged amount and returns the authorization URL
 */
export async function fundCheque(chequeId: string) {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('You must be signed in to fund a cheque');
  }

  const cheque = await prisma.cheque.findUnique({
    where: { id: chequeId },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  if (cheque.status !== 'draft') {
    throw new Error('Cheque is already funded or processed');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reference = `ch_charge_${cheque.id}_${Date.now()}`;

  // Call Paystack API
  const paystackSession = await paystack.initializeTransaction(
    user.email!,
    cheque.totalCharged,
    reference,
    `${appUrl}/cheque/${cheque.id}`
  );

  // Store Paystack reference in DB
  await prisma.cheque.update({
    where: { id: chequeId },
    data: {
      paystackChargeRef: reference,
    },
  });

  return paystackSession.authorization_url;
}

/**
 * Cancels a draft/funded cheque
 */
export async function cancelCheque(chequeId: string) {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const cheque = await prisma.cheque.findUnique({
    where: { id: chequeId },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  if (cheque.senderUserId !== user.id) {
    throw new Error('You do not own this cheque');
  }

  if (cheque.status === 'settled') {
    throw new Error('Settled cheques cannot be cancelled');
  }

  const updatedCheque = await prisma.cheque.update({
    where: { id: chequeId },
    data: {
      status: 'cancelled',
    },
  });

  return updatedCheque;
}

/**
 * Developer helper to simulate payment success locally, bypassing Paystack webhooks
 */
export async function simulateFundingSuccess(chequeId: string) {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const cheque = await prisma.cheque.findUnique({
    where: { id: chequeId },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  if (cheque.senderUserId !== user.id) {
    throw new Error('You do not own this cheque');
  }

  if (cheque.status !== 'draft') {
    throw new Error('Cheque is already funded or processed');
  }

  // Perform state transition
  const updatedCheque = await prisma.cheque.update({
    where: { id: chequeId },
    data: {
      status: 'recipient_notified',
      fundedAt: new Date(),
    },
  });

  // Send claim link email automatically via Resend
  const { emailService } = await import('../../lib/resend');
  await emailService.sendClaimLink(
    cheque.id,
    cheque.recipientEmail,
    cheque.senderName,
    cheque.amount,
    cheque.message || '',
    cheque.claimToken
  );

  return updatedCheque;
}
