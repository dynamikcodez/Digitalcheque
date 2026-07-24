import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/db';
import { emailService } from '../../../../lib/resend';

export async function POST(request: Request) {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

  // 1. Capture raw body and signature header
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Signature header missing' }, { status: 401 });
  }

  // 2. Verify webhook signature
  const hmac = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY);
  const calculatedSignature = hmac.update(rawBody).digest('hex');

  if (calculatedSignature !== signature) {
    console.error('Invalid Paystack webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  const eventId = payload.data?.id?.toString() || payload.event + '_' + Date.now();
  const eventType = payload.event;

  // 3. Idempotency check - see if we already processed this event
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });

  if (existingEvent && existingEvent.processed) {
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  // Record or upsert webhook event log
  await prisma.webhookEvent.upsert({
    where: { id: eventId },
    update: {},
    create: {
      id: eventId,
      eventType,
      rawPayload: payload,
      processed: false,
    },
  });

  try {
    switch (eventType) {
      case 'charge.success': {
        const reference = payload.data.reference;
        const feesKobo = payload.data.fees || 0;
        const actualCollectionFee = feesKobo / 100; // convert from kobo to NGN

        // Locate cheque by charge reference
        const cheque = await prisma.cheque.findFirst({
          where: { paystackChargeRef: reference },
        });

        if (!cheque) {
          console.warn(`Cheque not found for charge reference: ${reference}`);
          break;
        }

        if (cheque.status === 'draft') {
          // Perform state transitions: draft -> funded -> reserved -> recipient_notified
          await prisma.$transaction(async (tx) => {
            // Update cheque state and timestamp
            await tx.cheque.update({
              where: { id: cheque.id },
              data: {
                status: 'recipient_notified',
                fundedAt: new Date(),
              },
            });

            // Update transactions ledger with actual collection fee
            await tx.transactionsLedger.updateMany({
              where: { chequeId: cheque.id },
              data: {
                paystackCollectionFeeActual: actualCollectionFee,
              },
            });
          });

          // Send claim link email automatically via Resend
          console.log(`Sending claim link email to recipient: ${cheque.recipientEmail}`);
          await emailService.sendClaimLink(
            cheque.id,
            cheque.recipientEmail,
            cheque.senderName,
            cheque.amount,
            cheque.message || '',
            cheque.claimToken
          );

          // SMS Placeholder log
          if (cheque.recipientPhone) {
            await prisma.notificationsLog.create({
              data: {
                chequeId: cheque.id,
                recipientContact: cheque.recipientPhone,
                channel: 'sms',
                type: 'expiring',
                status: 'sent', // mock sms as sent
              },
            });
          }
        }
        break;
      }

      case 'transfer.success': {
        const transferCode = payload.data.transfer_code;
        const reference = payload.data.reference;
        const feeKobo = payload.data.fee || 0;
        const actualTransferFee = feeKobo / 100; // convert from kobo to NGN

        // Locate Transfer row in DB
        const transfer = await prisma.transfer.findFirst({
          where: {
            OR: [
              { paystackTransferCode: transferCode },
              { chequeId: reference }, // reference is set to chequeId in initiateTransfer
            ],
          },
        });

        if (!transfer) {
          console.warn(`Transfer not found for code: ${transferCode} or reference: ${reference}`);
          break;
        }

        const cheque = await prisma.cheque.findUnique({
          where: { id: transfer.chequeId },
          include: { ledger: true },
        });

        if (!cheque) {
          break;
        }

        if (cheque.status !== 'settled') {
          // Determine actual stamp duty based on amount
          const actualStampDuty = cheque.amount >= 10000 ? 50 : 0;

          await prisma.$transaction(async (tx) => {
            // Update cheque status to settled
            await tx.cheque.update({
              where: { id: cheque.id },
              data: {
                status: 'settled',
                settledAt: new Date(),
              },
            });

            // Update Transfer status to success
            await tx.transfer.update({
              where: { id: transfer.id },
              data: {
                status: 'success',
                completedAt: new Date(),
              },
            });

            // Calculate platform net margin and reconcile ledger
            const ledgerRow = cheque.ledger[0];
            const collectionFeeActual = ledgerRow?.paystackCollectionFeeActual || 0;
            const netMargin = cheque.feeAmount - collectionFeeActual - actualTransferFee - actualStampDuty;

            await tx.transactionsLedger.updateMany({
              where: { chequeId: cheque.id },
              data: {
                paystackTransferFeeActual: actualTransferFee,
                stampDutyActual: actualStampDuty,
                platformNetMargin: netMargin,
                reconciledAt: new Date(),
              },
            });
          });

          // Email sender that cheque has been claimed and settled
          console.log(`Sending settled notification email to sender: ${cheque.senderContact}`);
          await emailService.sendSettledNotification(
            cheque.id,
            cheque.senderContact,
            cheque.recipientEmail, // recipient name or contact
            cheque.amount
          );
        }
        break;
      }

      case 'transfer.failed':
      case 'transfer.reversed': {
        const transferCode = payload.data.transfer_code;
        const reference = payload.data.reference;

        const transfer = await prisma.transfer.findFirst({
          where: {
            OR: [
              { paystackTransferCode: transferCode },
              { chequeId: reference },
            ],
          },
        });

        if (transfer) {
          await prisma.transfer.update({
            where: { id: transfer.id },
            data: {
              status: 'failed',
              completedAt: new Date(),
            },
          });
          // Update cheque status so admin knows it failed
          await prisma.cheque.update({
            where: { id: transfer.chequeId },
            data: {
              status: 'destination_selected', // reset status so recipient or admin can retry
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
        break;
    }

    // Mark webhook event as processed
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { processed: true },
    });

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}
