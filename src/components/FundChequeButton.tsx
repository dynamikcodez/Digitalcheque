'use client';

import React, { useState } from 'react';
import { fundCheque } from '../app/actions/cheque';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';

interface FundButtonProps {
  chequeId: string;
}

export default function FundChequeButton({ chequeId }: FundButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFund = async () => {
    setLoading(true);
    setError('');

    try {
      const authorizationUrl = await fundCheque(chequeId);
      // Redirect to Squad checkout portal
      window.location.href = authorizationUrl;
    } catch (err: any) {
      console.error('Error initiating funding:', err);
      setError(err.message || 'Failed to initiate checkout with Squad Co. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleFund}
        disabled={loading}
        className="flex items-center justify-center w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Redirecting to Squad Co Checkout...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Pay & Fund Cheque
          </>
        )}
      </button>
    </div>
  );
}
