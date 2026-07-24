'use server';

import crypto from 'crypto';
import { prisma } from '../../lib/db';
import { emailService } from '../../lib/resend';
import { paystack } from '../../lib/paystack';

// Helper to hash the OTP code
function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Retrieves a masked summary of a cheque by its claim token
 */
export async function getChequeByToken(token: string) {
  const cheque = await prisma.cheque.findUnique({
    where: { claimToken: token },
    select: {
      id: true,
      senderName: true,
      recipientEmail: true,
      recipientPhone: true,
      amount: true,
      currency: true,
      message: true,
      expiryDate: true,
      status: true,
    },
  });

  if (!cheque) {
    throw new Error('Digital Cheque not found');
  }

  // Mask recipient email (e.g., u***r@domain.com)
  const [local, domain] = cheque.recipientEmail.split('@');
  const maskedEmail = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}@${domain}`
    : `***@${domain}`;

  return {
    ...cheque,
    maskedEmail,
  };
}

/**
 * Generates a 6-digit OTP code, hashes it, saves it to the database, and sends it via Resend
 */
export async function sendClaimOtp(token: string) {
  const cheque = await prisma.cheque.findUnique({
    where: { claimToken: token },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  // Validate cheque status
  if (
    cheque.status !== 'recipient_notified' &&
    cheque.status !== 'recipient_verified' &&
    cheque.status !== 'destination_selected'
  ) {
    throw new Error(`Cheque is currently in status: ${cheque.status} and cannot be verified`);
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = hashOtp(otpCode);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

  // Write OTP to DB
  await prisma.otpVerification.create({
    data: {
      chequeId: cheque.id,
      contact: cheque.recipientEmail,
      otpCodeHash: otpHash,
      expiresAt,
      attempts: 0,
    },
  });

  // Send email via Resend
  console.log(`Sending claim OTP email to recipient: ${cheque.recipientEmail}`);
  const result = await emailService.sendOtp(
    cheque.id,
    cheque.recipientEmail,
    cheque.senderName,
    cheque.amount,
    otpCode
  );

  if (!result) {
    throw new Error('Failed to send verification code. Please try again.');
  }

  return { success: true };
}

/**
 * Verifies the 6-digit OTP. On success, sets status to recipient_verified
 * and triggers notification to sender that claim process has started.
 */
export async function verifyClaimOtp(token: string, otpCode: string) {
  const cheque = await prisma.cheque.findUnique({
    where: { claimToken: token },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  // Fetch the latest OTP attempt for this cheque
  const otp = await prisma.otpVerification.findFirst({
    where: {
      chequeId: cheque.id,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'desc' },
  });

  if (!otp) {
    throw new Error('Verification code has expired or is invalid. Please request a new code.');
  }

  if (otp.attempts >= 5) {
    throw new Error('Too many incorrect attempts. Please request a new verification code.');
  }

  // Increment attempts
  await prisma.otpVerification.update({
    where: { id: otp.id },
    data: { attempts: otp.attempts + 1 },
  });

  const codeHash = hashOtp(otpCode);

  if (otp.otpCodeHash !== codeHash) {
    throw new Error('Incorrect verification code');
  }

  // Match! Complete verification inside a transaction
  await prisma.$transaction(async (tx) => {
    // Mark OTP verified
    await tx.otpVerification.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    });

    // Update cheque status
    await tx.cheque.update({
      where: { id: cheque.id },
      data: {
        status: 'recipient_verified',
        claimedAt: new Date(),
      },
    });
  });

  // Notify sender immediately that claim has started
  console.log(`Sending claim started notification email to sender: ${cheque.senderContact}`);
  await emailService.sendClaimedNotification(
    cheque.id,
    cheque.senderContact,
    cheque.recipientEmail, // Recipient identifier
    cheque.amount
  );

  return { success: true };
}

/**
 * Returns the list of Nigerian banks supported by Paystack
 */
export async function getPayoutBanks() {
  try {
    return await paystack.getBanks();
  } catch (error) {
    console.error('Failed to get banks from Paystack:', error);
    throw new Error('Could not retrieve bank list. Please try again later.');
  }
}

/**
 * Resolves a bank account number to get the account holder's name
 */
export async function resolveBankAccount(accountNumber: string, bankCode: string) {
  try {
    return await paystack.resolveAccountNumber(accountNumber, bankCode);
  } catch (error) {
    console.error('Failed to resolve account number:', error);
    throw new Error('Invalid account number or bank code');
  }
}

/**
 * Saves bank payout destination details, creates Paystack Transfer Recipient,
 * and initiates the test transfer payout.
 */
export async function processPayout(
  token: string,
  accountNumber: string,
  bankCode: string,
  accountName: string
) {
  const cheque = await prisma.cheque.findUnique({
    where: { claimToken: token },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  // Payout can only be processed if recipient is verified
  if (cheque.status !== 'recipient_verified' && cheque.status !== 'destination_selected') {
    throw new Error('You must verify your identity before choosing a payout destination');
  }

  try {
    // 1. Create Paystack Transfer Recipient
    const recipient = await paystack.createTransferRecipient(
      accountName,
      accountNumber,
      bankCode
    );

    // 2. Save payout destination and initiate transfer inside a transaction
    const transferResult = await prisma.$transaction(async (tx) => {
      // Create/update payout destination
      await tx.payoutDestination.create({
        data: {
          chequeId: cheque.id,
          method: 'bank',
          accountNumber,
          accountName,
          bankCode,
          paystackRecipientCode: recipient.recipient_code,
        },
      });

      // Update Cheque status
      await tx.cheque.update({
        where: { id: cheque.id },
        data: {
          status: 'destination_selected',
        },
      });

      // 3. Trigger Paystack Initiate Transfer
      const transferRef = cheque.id; // Unique reference tied to cheque ID
      const paystackTransfer = await paystack.initiateTransfer(
        recipient.recipient_code,
        cheque.amount,
        transferRef,
        cheque.message ? `Digital Cheque: ${cheque.message.substring(0, 30)}` : 'Digital Cheque Payout'
      );

      // Create local transfer record
      const transferRow = await tx.transfer.create({
        data: {
          chequeId: cheque.id,
          paystackTransferCode: paystackTransfer.transfer_code,
          status: 'pending',
          amount: cheque.amount,
          fee: 0, // actual fee will be reconciled via webhook
        },
      });

      return transferRow;
    });

    return { success: true, transferCode: transferResult.paystackTransferCode };
  } catch (error: any) {
    console.error('Error processing payout:', error);
    throw new Error(error.message || 'Failed to process payout transfer. Please try again.');
  }
}
