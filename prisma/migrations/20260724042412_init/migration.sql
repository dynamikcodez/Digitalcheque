-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cheques" (
    "id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_contact" TEXT NOT NULL,
    "recipient_phone" TEXT,
    "recipient_email" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "fee_amount" DOUBLE PRECISION NOT NULL,
    "fee_percentage_applied" DOUBLE PRECISION NOT NULL,
    "fee_fixed_applied" DOUBLE PRECISION NOT NULL,
    "total_charged" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "claim_token" TEXT NOT NULL,
    "paystack_charge_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "funded_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "cheque_id" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "otp_code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_destinations" (
    "id" TEXT NOT NULL,
    "cheque_id" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'bank',
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "paystack_recipient_code" TEXT NOT NULL,

    CONSTRAINT "payout_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "cheque_id" TEXT NOT NULL,
    "paystack_transfer_code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_log" (
    "id" TEXT NOT NULL,
    "cheque_id" TEXT NOT NULL,
    "recipient_contact" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "notifications_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "fee_percentage" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "fee_fixed" DOUBLE PRECISION NOT NULL DEFAULT 200.0,
    "currency_default" TEXT NOT NULL DEFAULT 'NGN',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions_ledger" (
    "id" TEXT NOT NULL,
    "cheque_id" TEXT NOT NULL,
    "paystack_collection_fee_estimate" DOUBLE PRECISION NOT NULL,
    "paystack_collection_fee_actual" DOUBLE PRECISION,
    "paystack_transfer_fee_estimate" DOUBLE PRECISION NOT NULL,
    "paystack_transfer_fee_actual" DOUBLE PRECISION,
    "stamp_duty_actual" DOUBLE PRECISION,
    "platform_fee_collected" DOUBLE PRECISION NOT NULL,
    "platform_net_margin" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciled_at" TIMESTAMP(3),

    CONSTRAINT "transactions_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_claim_token_key" ON "cheques"("claim_token");

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_cheque_id_fkey" FOREIGN KEY ("cheque_id") REFERENCES "cheques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_destinations" ADD CONSTRAINT "payout_destinations_cheque_id_fkey" FOREIGN KEY ("cheque_id") REFERENCES "cheques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_cheque_id_fkey" FOREIGN KEY ("cheque_id") REFERENCES "cheques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_cheque_id_fkey" FOREIGN KEY ("cheque_id") REFERENCES "cheques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions_ledger" ADD CONSTRAINT "transactions_ledger_cheque_id_fkey" FOREIGN KEY ("cheque_id") REFERENCES "cheques"("id") ON DELETE CASCADE ON UPDATE CASCADE;
