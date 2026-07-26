import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/db';
import { emailService } from '../../../../lib/resend';

export async function POST(request: Request) {
  const SQUAD_SECRET_KEY = process.env.SQUAD_SECRET_KEY || '';

  // 1. Capture raw body and signature header
  const rawBody = await request.text();
  const signature = request.headers.get('x-squad-signature') || request.headers.get('x-squad-encrypted-body');

  if (!signature) {
    return NextResponse.json({ error: 'Signature header missing' }, { status: 401 });
  }

  // 2. Verify webhook signature
  const hmac = crypto.createHmac('sha512', SQUAD_SECRET_KEY);
  const calculatedSignature = hmac.update(rawBody).digest('hex');

  if (calculatedSignature !== signature) {
    console.error('Invalid Squad webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  const event = payload.Event || payload.event;
  
  // Extract reference
  const reference = payload.TransactionRef || payload.Body?.transaction_reference;
  const eventId = reference || event + '_' + Date.now();

  // 3. Idempotency check
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });

  if (existingEvent && existingEvent.processed) {
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  // Record webhook log
  await prisma.webhookEvent.upsert({
    where: { id: eventId },
    update: {},
    create: {
      id: eventId,
      eventType: event || 'charge_successful',
      rawPayload: payload,
      processed: false,
    },
  });

  try {
    if (event === 'charge_successful' || event === 'charge.success') {
      const feesKobo = payload.Body?.transaction_fee || payload.transaction_fee || 0;
      const actualCollectionFee = feesKobo / 100; // kobo to NGN

      // Locate cheque by reference. Squad reference format: ch_charge_[chequeId]_[timestamp]
      // We can extract the chequeId from the middle of the reference!
      // Format: ch_charge_{chequeId}_{timestamp}
      let chequeId = '';
      if (reference && reference.startsWith('ch_charge_')) {
        const parts = reference.split('_');
        if (parts.length >= 3) {
          chequeId = parts[2];
        }
      }

      if (!chequeId) {
        console.warn(`Could not extract chequeId from reference: ${reference}`);
        return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
      }

      const cheque = await prisma.cheque.findUnique({
        where: { id: chequeId },
      });

      if (!cheque) {
        console.warn(`Cheque not found for extracted ID: ${chequeId}`);
        return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });
      }

      if (cheque.status === 'draft') {
        await prisma.$transaction(async (tx) => {
          await tx.cheque.update({
            where: { id: cheque.id },
            data: {
              status: 'recipient_notified',
              fundedAt: new Date(),
            },
          });

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
      }
    }

    // Mark webhook event as processed
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { processed: true },
    });

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Error processing Squad webhook event:', error);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}
