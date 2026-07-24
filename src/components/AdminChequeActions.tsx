'use client';

import React, { useState } from 'react';
import { adminMarkChequeExpired, adminResendClaimNotification } from '../app/actions/admin';
import { Ban, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface ChequeActionsProps {
  chequeId: string;
  status: string;
}

export default function AdminChequeActions({ chequeId, status }: ChequeActionsProps) {
  const [loading, setLoading] = useState<string | null>(null); // 'expire' | 'resend' | null
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleExpire = async () => {
    setLoading('expire');
    setMessage(null);

    try {
      await adminMarkChequeExpired(chequeId);
      setMessage({ text: 'Cheque manually marked as expired.', type: 'success' });
      window.location.reload(); // refresh page data
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || 'Failed to expire cheque.', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const handleResendNotification = async () => {
    setLoading('resend');
    setMessage(null);

    try {
      await adminResendClaimNotification(chequeId);
      setMessage({ text: 'Claim link notification resent successfully.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || 'Failed to resend email.', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const isSettled = status === 'settled';
  const isDraft = status === 'draft';
  const isCancelledOrExpired = ['cancelled', 'expired'].includes(status);

  return (
    <div className="flex flex-col space-y-1.5 w-full">
      {message && (
        <div
          className={`text-2xs p-2 rounded-lg flex items-center space-x-1 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
              : 'bg-rose-50 text-rose-800 border-rose-100'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        {/* Resend Link */}
        <button
          onClick={handleResendNotification}
          disabled={loading !== null || isSettled || isDraft || isCancelledOrExpired}
          className="inline-flex items-center px-2 py-1 bg-secondary text-foreground hover:bg-muted font-semibold text-2xs rounded-lg border border-border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading === 'resend' ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Mail className="w-3 h-3 mr-1 text-muted-foreground" />
          )}
          Resend Email
        </button>

        {/* Force Expire */}
        <button
          onClick={handleExpire}
          disabled={loading !== null || isSettled || isCancelledOrExpired}
          className="inline-flex items-center px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-2xs rounded-lg border border-rose-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading === 'expire' ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Ban className="w-3 h-3 mr-1 text-rose-500" />
          )}
          Expire Cheque
        </button>
      </div>
    </div>
  );
}
