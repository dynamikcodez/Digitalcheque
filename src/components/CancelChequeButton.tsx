'use client';

import React, { useState } from 'react';
import { cancelCheque } from '../app/actions/cheque';
import { useRouter } from 'next/navigation';
import { Ban, Loader2, AlertCircle } from 'lucide-react';

interface CancelButtonProps {
  chequeId: string;
}

export default function CancelChequeButton({ chequeId }: CancelButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    setError('');

    try {
      await cancelCheque(chequeId);
      setConfirming(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error cancelling cheque:', err);
      setError(err.message || 'Failed to cancel cheque. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="space-y-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl">
        <p className="text-xs text-rose-800 dark:text-rose-300 font-semibold flex items-center">
          <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
          Are you sure you want to cancel this cheque? The reserved funds will be returned.
        </p>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
            Yes, Cancel Cheque
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="px-3 py-1.5 bg-secondary text-foreground font-semibold text-xs rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
        </div>
        {error && <p className="text-3xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center justify-center px-4 py-2 border border-destructive/20 text-destructive hover:bg-destructive/5 font-semibold text-sm rounded-xl transition-all"
    >
      <Ban className="w-4 h-4 mr-1.5" />
      Cancel Cheque
    </button>
  );
}
