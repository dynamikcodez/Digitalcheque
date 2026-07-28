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
    console.error('[Squad Webhook] Signature header (x-squad-signature or x-squad-encrypted-body) is missing.');
    return NextResponse.json({ error: 'Signature header missing' }, { status: 401 });
  }

  if (!SQUAD_SECRET_KEY) {
    console.error('[Squad Webhook] SQUAD_SECRET_KEY environment variable is not defined on the server.');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // 2. Verify webhook signature
  const hmac = crypto.createHmac('sha512', SQUAD_SECRET_KEY);
  const calculatedSignature = hmac.update(rawBody).digest('hex');

  const payload = JSON.parse(rawBody);
  const event = payload.Event || payload.event || payload.event_type;

  // Construct Version 3 pipe-separated string to hash
  // Format: transaction_reference|virtual_account_number|currency|principal_amount|settled_amount|customer_identifier
  const transaction_reference = payload.Body?.transaction_reference || payload.transaction_reference || payload.TransactionRef || '';
  const virtual_account_number = payload.Body?.virtual_account_number || payload.virtual_account_number || '';
  const currency = payload.Body?.currency || payload.currency || 'NGN';
  const principal_amount = String(payload.Body?.principal_amount || payload.Body?.amount || payload.principal_amount || payload.amount || '0');
  const settled_amount = String(payload.Body?.settled_amount || payload.settled_amount || principal_amount || '0');
  const customer_identifier = payload.Body?.customer_identifier || payload.customer_identifier || '';

  const pipeString = `${transaction_reference}|${virtual_account_number}|${currency}|${principal_amount}|${settled_amount}|${customer_identifier}`;
  const hmacV3 = crypto.createHmac('sha512', SQUAD_SECRET_KEY);
  const calculatedSignatureV3 = hmacV3.update(pipeString).digest('hex');

  const isRawMatch = calculatedSignature.toLowerCase() === signature.toLowerCase();
  const isPipeMatch = calculatedSignatureV3.toLowerCase() === signature.toLowerCase();

  if (!isRawMatch && !isPipeMatch) {
    console.error('[Squad Webhook] Signature mismatch.');
    console.error('Calculated Raw HMAC:', calculatedSignature.toLowerCase());
    console.error('Calculated Pipe HMAC (V3):', calculatedSignatureV3.toLowerCase());
    console.error('Calculated Pipe String (V3):', pipeString);
    console.error('Received Header:', signature.toLowerCase());
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Extract reference
  const reference = transaction_reference;
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

        // Resolve appUrl from webhook request headers dynamically
        const host = request.headers.get('host') || 'localhost:3000';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const appUrl = `${proto}://${host}`;

        // Send claim link email automatically via Resend
        console.log(`Sending claim link email to recipient: ${cheque.recipientEmail}`);
        await emailService.sendClaimLink(
          cheque.id,
          cheque.recipientEmail,
          cheque.senderName,
          cheque.amount,
          cheque.message || '',
          cheque.claimToken,
          appUrl
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
