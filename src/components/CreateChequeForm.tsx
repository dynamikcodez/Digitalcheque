'use client';

import React, { useState, useEffect } from 'react';
import { createCheque, CreateChequeInput } from '../app/actions/cheque';
import { useRouter } from 'next/navigation';
import { HelpCircle, Loader2, ArrowRight, DollarSign, Calendar, Mail, MessageSquare, Phone } from 'lucide-react';
import { calculatePlatformFee } from '../lib/fees';

interface CreateFormProps {
  feePercentage: number;
  feeFixed: number;
}

export default function CreateChequeForm({ feePercentage, feeFixed }: CreateFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState<number | ''>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  const [feeAmount, setFeeAmount] = useState(0);
  const [totalCharged, setTotalCharged] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  // Re-calculate fees live as the amount changes
  useEffect(() => {
    if (amount && amount > 0) {
      const { feeAmount: calcFee, totalCharged: calcTotal } = calculatePlatformFee(
        amount,
        feePercentage,
        feeFixed
      );
      setFeeAmount(calcFee);
      setTotalCharged(calcTotal);
    } else {
      setFeeAmount(0);
      setTotalCharged(0);
    }
  }, [amount, feePercentage, feeFixed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!recipientEmail) {
      setError('Recipient email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const input: CreateChequeInput = {
        amount,
        recipientEmail,
        recipientPhone: recipientPhone || undefined,
        message: message || undefined,
        expiryDate: expiryDate || undefined,
      };

      const cheque = await createCheque(input);
      router.push(`/create/${cheque.id}/fund`);
    } catch (err: any) {
      console.error('Failed to create cheque:', err);
      setError(err.message || 'Failed to create Digital Cheque. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-card border border-border p-8 rounded-2xl shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-semibold flex items-center">
            Cheque Amount
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">
              ₦
            </span>
            <input
              id="amount"
              type="number"
              required
              min="100"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Number(e.target.value);
                setAmount(val);
              }}
              disabled={loading}
              className="flex h-12 w-full rounded-xl border border-input bg-transparent pl-8 pr-12 py-2 text-lg font-bold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase bg-secondary px-2 py-1 rounded">
              NGN
            </span>
          </div>
        </div>

        {/* Live Fee Calculator Display */}
        {amount !== '' && amount > 0 && (
          <div className="bg-secondary/45 border border-border rounded-xl p-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center">
                Processing Fee
                <span className="relative ml-1">
                  <button
                    type="button"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip(!showTooltip)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                  {showTooltip && (
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-48 p-2 bg-foreground text-background text-3xs rounded shadow-lg z-50 text-center leading-normal animate-in fade-in duration-150">
                      Covers secure payment processing and payout transfer on both legs of this transaction.
                    </span>
                  )}
                </span>
              </span>
              <span>₦{feeAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-base border-t border-border/60 pt-2">
              <span>Total Charged</span>
              <span className="text-primary">₦{totalCharged.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Recipient Email (Required) */}
        <div className="space-y-2">
          <label htmlFor="recipientEmail" className="text-sm font-semibold">
            Recipient Email (Required)
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="recipientEmail"
              type="email"
              required
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={loading}
              className="flex h-11 w-full rounded-xl border border-input bg-transparent px-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Recipient Phone (Optional) */}
        <div className="space-y-2">
          <label htmlFor="recipientPhone" className="text-sm font-semibold">
            Recipient Phone (Optional)
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="recipientPhone"
              type="tel"
              placeholder="+2348000000000"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              disabled={loading}
              className="flex h-11 w-full rounded-xl border border-input bg-transparent px-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Message (Optional) */}
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-semibold">
            Personal Message (Optional)
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <textarea
              id="message"
              placeholder="Add a nice birthday greeting, description, or reference..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={3}
              className="flex w-full rounded-xl border border-input bg-transparent px-10 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Expiry Date (Optional) */}
        <div className="space-y-2">
          <label htmlFor="expiryDate" className="text-sm font-semibold">
            Expiry Date (Optional)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={loading}
              min={new Date().toISOString().split('T')[0]}
              className="flex h-11 w-full rounded-xl border border-input bg-transparent px-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <p className="text-3xs text-muted-foreground">If unclaimed by this date, the cheque will automatically lock/expire.</p>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating cheque...
            </>
          ) : (
            <>
              Create & Proceed to Funding
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
