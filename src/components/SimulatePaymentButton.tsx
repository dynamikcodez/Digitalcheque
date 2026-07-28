'use client';

import React, { useState } from 'react';
import { simulateFundingSuccess } from '../app/actions/cheque';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, Sparkles } from 'lucide-react';

interface SimulateButtonProps {
  chequeId: string;
}

export default function SimulatePaymentButton({ chequeId }: SimulateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSimulate = async () => {
    setLoading(true);
    setError('');

    try {
      await simulateFundingSuccess(chequeId);
      router.push(`/cheque/${chequeId}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 mt-4 pt-4 border-t border-dashed border-border">
      <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-500">
        <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
        <span className="text-3xs uppercase font-bold tracking-wider">Local Sandbox Dev Tool</span>
      </div>

      {error && (
        <div className="text-2xs text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      <button
        onClick={handleSimulate}
        disabled={loading}
        className="w-full inline-flex items-center justify-center h-10 px-4 rounded-xl border border-dashed border-amber-300 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Simulating Webhook Success...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Simulate Webhook & Send Email
          </>
        )}
      </button>
      <p className="text-4xs text-muted-foreground text-center leading-normal">
        Use this if your local network blocks ngrok or prevents Squad Co from reaching localhost.
      </p>
    </div>
  );
}
