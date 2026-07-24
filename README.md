# Digital Cheque

Digital Cheque is a fintech web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma** + **PostgreSQL**. 

It allows users to send money to anyone using only the recipient's email or phone number. The recipient receives a secure claim link, verifies their identity via a 6-digit OTP code sent using **Resend**, and claims the funds directly to their bank account using **Paystack**.

---

## Technical Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database ORM**: Prisma 7 (using native PostgreSQL driver adapters)
- **Authentication**: Supabase Auth (Email Magic Link)
- **Payment Processing**: Paystack API (charges, payouts, and resolving account names)
- **Email Service**: Resend API (OTP verification and claim logs)
- **Host Target**: Vercel

---

## State Machine for Cheques

Each digital cheque transitions through a strict state machine from creation to final settlement:

```
draft ──> funded ──> reserved ──> recipient_notified ──> recipient_verified ──> destination_selected ──> settled
```
*(At any point before settlement, a cheque can be marked as `expired` or `cancelled` by the sender or system admin)*

---

## Database Schema (Prisma)

The PostgreSQL database is organized into the following tables (matching exact column mapping specifications):

- `users`: Stores sender profiles with authentication metadata.
- `cheques`: The central ledger of payments, amounts, fees, and lifecycle states.
- `otp_verifications`: Tracks hashed 6-digit claims verification codes and attempt rates.
- `payout_destinations`: Maps claims to Paystack transfer recipients and bank accounts.
- `transfers`: Stores active transfer codes and payout statuses from Paystack.
- `webhook_events`: Idempotency registry tracking and verifying Paystack callbacks.
- `notifications_log`: History of email/SMS deliveries and delivery status.
- `platform_settings`: Editable platform fee parameters (default: 3% fee + ₦200).
- `transactions_ledger`: Revenue reconciliation registry computing estimates vs actual Paystack charges and net margins.

---

## Fee & Revenue Reconciliation Model

To prevent net-negative transactions, the platform implements a dual-leg fee model:

1. **Sender Fee**: 3% + ₦200 is charged on top of the gift amount (stored on creation).
2. **Estimates vs Actuals**:
   - **Collection Fee**: 3% + ₦200 (capped at ₦2,000; waived for transactions under ₦2,500).
   - **Transfer Fee**: Payout band fee (₦10, ₦25, or ₦50) + ₦50 Stamp Duty on transfers ≥ ₦10,000.
   - **Margin Formula**:
     $$\text{platform\_net\_margin} = \text{platform\_fee\_collected} - \text{collection\_fee\_actual} - \text{transfer\_fee\_actual} - \text{stamp\_duty\_actual}$$

Actual processing costs are fetched automatically from Paystack webhook payloads on success, calculating exact profit margins for the admin panel.

---

## Local Development Setup

### 1. Prerequisites
- Docker (for database orchestration)
- Node.js v24+
- npm v11+

### 2. Launch the Database
We spin up a dedicated PostgreSQL instance on port `5433` to prevent local port conflicts:
```bash
docker run -d --name digitalcheque-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=digitalcheque -p 5433:5432 postgres:16
```

### 3. Environment Variables
Create a `.env` file at the root of the project with the following configuration:
```env
# Database connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/digitalcheque?schema=public"

# Paystack API Credentials (Update with your keys)
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_PUBLIC_KEY="pk_live_..."

# Resend API Credentials
RESEND_API_KEY="re_..."

# Supabase Client Credentials (Magic Link Sign-in)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup & Seeding
Configure and seed the platform settings and tables:
```bash
# Run migrations
npx prisma migrate dev --name init

# Generate client
npx prisma generate

# Seed settings database
npx prisma db seed
```

### 5. Running the App
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.
