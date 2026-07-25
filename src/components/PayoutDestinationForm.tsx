'use client';

import React, { useState, useEffect } from 'react';
import { resolveBankAccount, processPayout } from '../app/actions/recipient';
import { useRouter } from 'next/navigation';
import { Building2, Wallet, ShoppingBag, Loader2, ArrowRight, CheckCircle2, AlertCircle, User } from 'lucide-react';

interface Bank {
  name: string;
  code: string;
}

interface PayoutFormProps {
  token: string;
  amount: number;
  currency: string;
  banks: Bank[];
}

export default function PayoutDestinationForm({ token, amount, currency, banks }: PayoutFormProps) {
  const router = useRouter();
  const [method, setMethod] = useState<'bank' | 'wallet' | 'store_credit'>('bank');
  
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-resolve account number when it reaches 10 digits and bank is selected
  useEffect(() => {
    const triggerResolve = async () => {
      if (accountNumber.length === 10 && selectedBankCode) {
        setResolving(true);
        setResolveError('');
        setResolvedName('');
        try {
          const res = await resolveBankAccount(accountNumber, selectedBankCode);
          if (res.success && res.data) {
            setResolvedName(res.data.account_name);
          } else {
            setResolveError(res.error || 'Could not verify account name. Please check details.');
          }
        } catch (err: any) {
          console.error(err);
          setResolveError('Network error resolving bank account. Please try again.');
        } finally {
          setResolving(false);
        }
      } else {
        setResolvedName('');
        setResolveError('');
      }
    };

    triggerResolve();
  }, [accountNumber, selectedBankCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method !== 'bank') return;
    if (!selectedBankCode || accountNumber.length !== 10 || !resolvedName) {
      setError('Please provide valid bank details and verify account name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await processPayout(token, accountNumber, selectedBankCode, resolvedName);
      if (res.success) {
        router.push(`/claim/${token}/success`);
      } else {
        setError(res.error || 'Payout settlement failed. Please try again or contact support.');
      }
    } catch (err: any) {
      console.error('Payout failed:', err);
      setError('Network error processing payout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Payout Method Tabs */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setMethod('bank')}
          className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all cursor-pointer ${
            method === 'bank'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-5 h-5 mb-1.5" />
          <span className="text-xs font-semibold">Bank Account</span>
        </button>

        {/* Disabled wallet placeholder */}
        <div className="flex flex-col items-center justify-center p-4 border border-border bg-card text-muted-foreground/45 rounded-xl cursor-not-allowed opacity-60 relative group">
          <Wallet className="w-5 h-5 mb-1.5" />
          <span className="text-xs font-semibold">Wallet Credit</span>
          <span className="absolute -top-2 bg-secondary text-muted-foreground text-4xs font-bold px-1.5 py-0.5 rounded border border-border">
            SOON
          </span>
        </div>

        {/* Disabled store credit placeholder */}
        <div className="flex flex-col items-center justify-center p-4 border border-border bg-card text-muted-foreground/45 rounded-xl cursor-not-allowed opacity-60 relative group">
          <ShoppingBag className="w-5 h-5 mb-1.5" />
          <span className="text-xs font-semibold">Store Giftcard</span>
          <span className="absolute -top-2 bg-secondary text-muted-foreground text-4xs font-bold px-1.5 py-0.5 rounded border border-border">
            SOON
          </span>
        </div>
      </div>

      {/* Main Payout Form Card */}
      <div className="bg-card border border-border p-8 rounded-2xl shadow-xl">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 text-center mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bank Choice */}
          <div className="space-y-2">
            <label htmlFor="bank" className="text-sm font-semibold">
              Select Payout Bank
            </label>
            <select
              id="bank"
              required
              value={selectedBankCode}
              onChange={(e) => {
                setSelectedBankCode(e.target.value);
                setResolvedName('');
                setResolveError('');
              }}
              disabled={loading}
              className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
            >
              <option value="">-- Choose Bank --</option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <label htmlFor="accountNumber" className="text-sm font-semibold">
              Bank Account Number (NUBAN)
            </label>
            <input
              id="accountNumber"
              type="text"
              required
              maxLength={10}
              placeholder="10-digit NUBAN number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').substring(0, 10))}
              disabled={loading || !selectedBankCode}
              className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3.5 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {/* Name Resolution Indicators */}
          {resolving && (
            <div className="flex items-center text-xs text-muted-foreground p-3 bg-secondary/45 rounded-xl">
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
              Resolving bank account holder name...
            </div>
          )}

          {resolveError && (
            <div className="flex items-start text-xs text-destructive p-3 bg-destructive/5 rounded-xl border border-destructive/10">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
              <span>{resolveError}</span>
            </div>
          )}

          {resolvedName && (
            <div className="flex items-center text-xs text-emerald-800 dark:text-emerald-400 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-950/40">
              <CheckCircle2 className="w-4.5 h-4.5 mr-2 shrink-0 text-emerald-600" />
              <div className="space-y-0.5">
                <span className="text-3xs text-muted-foreground uppercase font-bold tracking-wider">Account Holder Verified</span>
                <p className="font-bold text-sm leading-none mt-0.5">{resolvedName}</p>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading || !resolvedName || accountNumber.length !== 10 || !selectedBankCode}
            className="flex items-center justify-center w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Settling payout transfer...
              </>
            ) : (
              <>
                Confirm Payout & Receive ₦{amount.toLocaleString()}
                <ArrowRight className="w-5 h-5 ml-1.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-3xs text-muted-foreground leading-normal mt-4">
          Funds are transferred instantly in test mode. Settlement timeline depends on bank networks.
        </p>
      </div>
    </div>
  );
}
